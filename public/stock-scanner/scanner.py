#!/usr/bin/env python3
"""
台股量能放大 + KD 金叉選股掃描器
每日盤後執行，篩選出符合以下條件的股票：
1. 當日成交量 > 1000 張
2. 當日成交量 > 前5日平均成交量的 2 倍（量能突然放大）
3. KD 金叉（K 值由下往上穿越 D 值）
"""

import json
import os
import time
import requests
import pandas as pd
from datetime import datetime, timedelta

# === 設定 ===
VOLUME_THRESHOLD = 1000        # 成交量門檻（張）
VOLUME_SURGE_RATIO = 2.0       # 量增倍數門檻
KD_PERIOD = 9                  # KD 指標週期
REQUEST_DELAY = 3.5            # 每次 API 請求間隔秒數（避免被封鎖）
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "scan_result.json")


def get_stock_list():
    """取得台股上市公司清單"""
    url = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
    print("📋 正在取得上市公司清單...")
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        # 篩選出一般股票（代碼為4碼數字）
        stocks = []
        seen = set()
        for item in data:
            code = item.get("Code", "")
            name = item.get("Name", "")
            if code and len(code) == 4 and code.isdigit() and code not in seen:
                seen.add(code)
                stocks.append({"code": code, "name": name})
        print(f"  找到 {len(stocks)} 檔上市股票")
        return stocks
    except Exception as e:
        print(f"  ❌ 取得股票清單失敗: {e}")
        return []


def fetch_stock_monthly_data(stock_code, date_str):
    """
    取得指定股票的月成交資訊
    date_str 格式: YYYYMMDD
    回傳該月每日交易資料 list
    """
    url = (
        f"https://www.twse.com.tw/exchangeReport/STOCK_DAY"
        f"?response=json&date={date_str}&stockNo={stock_code}"
    )
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        result = resp.json()
        if result.get("stat") != "OK":
            return []
        return result.get("data", [])
    except Exception:
        return []


def fetch_stock_history(stock_code, months=3):
    """
    取得指定股票近 N 個月的成交資料
    回傳 pandas DataFrame，欄位: date, open, high, low, close, volume
    """
    all_rows = []
    today = datetime.now()

    for i in range(months):
        target = today - timedelta(days=30 * i)
        date_str = target.strftime("%Y%m01")
        rows = fetch_stock_monthly_data(stock_code, date_str)

        for row in rows:
            try:
                # TWSE 資料格式: [日期, 成交股數, 成交金額, 開盤, 最高, 最低, 收盤, 漲跌, 成交筆數]
                # 日期為民國年格式 e.g. "115/02/14"
                date_parts = row[0].strip().split("/")
                year = int(date_parts[0]) + 1911
                month = int(date_parts[1])
                day = int(date_parts[2])
                date = datetime(year, month, day)

                # 成交股數中有逗號
                volume_shares = int(row[1].replace(",", ""))
                volume_lots = volume_shares // 1000  # 轉換為張

                open_price = float(row[3].replace(",", ""))
                high_price = float(row[4].replace(",", ""))
                low_price = float(row[5].replace(",", ""))
                close_price = float(row[6].replace(",", ""))

                all_rows.append({
                    "date": date,
                    "open": open_price,
                    "high": high_price,
                    "low": low_price,
                    "close": close_price,
                    "volume": volume_lots
                })
            except (ValueError, IndexError):
                continue

        time.sleep(REQUEST_DELAY)

    if not all_rows:
        return pd.DataFrame()

    df = pd.DataFrame(all_rows)
    df = df.drop_duplicates(subset="date").sort_values("date").reset_index(drop=True)
    return df


def calculate_kd(df, period=9):
    """
    計算 KD 指標
    回傳 DataFrame 新增 rsv, k, d 欄位
    """
    if len(df) < period:
        return df

    df = df.copy()
    df["lowest"] = df["low"].rolling(window=period, min_periods=period).min()
    df["highest"] = df["high"].rolling(window=period, min_periods=period).max()

    # RSV
    df["rsv"] = ((df["close"] - df["lowest"]) / (df["highest"] - df["lowest"])) * 100
    df["rsv"] = df["rsv"].fillna(50)

    # K, D 初始值 50
    k_values = [50.0] * len(df)
    d_values = [50.0] * len(df)

    start_idx = df["lowest"].first_valid_index()
    if start_idx is None:
        return df

    for i in range(start_idx, len(df)):
        if i == start_idx:
            k_values[i] = 50.0
            d_values[i] = 50.0
        else:
            k_values[i] = k_values[i - 1] * (2 / 3) + df.iloc[i]["rsv"] * (1 / 3)
            d_values[i] = d_values[i - 1] * (2 / 3) + k_values[i] * (1 / 3)

    df["k"] = k_values
    df["d"] = d_values

    return df


def check_stock(stock_code, stock_name):
    """
    檢查單一股票是否符合條件
    回傳符合條件的股票資訊 dict 或 None
    """
    df = fetch_stock_history(stock_code, months=3)

    if df.empty or len(df) < 15:
        return None

    df = calculate_kd(df, KD_PERIOD)

    # 取最後一筆（最新交易日）
    latest = df.iloc[-1]
    prev = df.iloc[-2]

    # 條件 1: 成交量 > 1000 張
    if latest["volume"] < VOLUME_THRESHOLD:
        return None

    # 條件 2: 量能放大（當日成交量 > 前5日均量 × 倍數門檻）
    recent_5_avg = df.iloc[-6:-1]["volume"].mean()
    if recent_5_avg <= 0:
        return None
    volume_ratio = latest["volume"] / recent_5_avg
    if volume_ratio < VOLUME_SURGE_RATIO:
        return None

    # 條件 3: KD 金叉（昨日 K < D，今日 K >= D）
    if not (prev["k"] < prev["d"] and latest["k"] >= latest["d"]):
        return None

    return {
        "code": stock_code,
        "name": stock_name,
        "date": latest["date"].strftime("%Y-%m-%d"),
        "close": round(latest["close"], 2),
        "volume": int(latest["volume"]),
        "volume_avg5": round(recent_5_avg, 0),
        "volume_ratio": round(volume_ratio, 2),
        "k": round(latest["k"], 2),
        "d": round(latest["d"], 2),
        "prev_k": round(prev["k"], 2),
        "prev_d": round(prev["d"], 2),
    }


def run_scan():
    """執行完整掃描"""
    start_time = time.time()
    print("=" * 60)
    print("🔍 台股量能放大 + KD 金叉選股掃描器")
    print(f"📅 執行時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print(f"📊 篩選條件:")
    print(f"   - 成交量 > {VOLUME_THRESHOLD} 張")
    print(f"   - 量增倍數 > {VOLUME_SURGE_RATIO}x（相較前5日均量）")
    print(f"   - KD 金叉（K 由下往上穿越 D）")
    print("=" * 60)

    stocks = get_stock_list()
    if not stocks:
        print("❌ 無法取得股票清單，結束掃描")
        return

    results = []
    total = len(stocks)

    for i, stock in enumerate(stocks):
        code = stock["code"]
        name = stock["name"]
        progress = f"[{i + 1}/{total}]"
        print(f"\r{progress} 掃描 {code} {name}...", end="", flush=True)

        try:
            result = check_stock(code, name)
            if result:
                results.append(result)
                print(f"\r{progress} ✅ {code} {name} — "
                      f"量: {result['volume']}張, "
                      f"量增: {result['volume_ratio']}x, "
                      f"K: {result['k']}, D: {result['d']}")
        except Exception as e:
            print(f"\r{progress} ⚠️  {code} {name} 發生錯誤: {e}")

    # 按量增倍數排序
    results.sort(key=lambda x: x["volume_ratio"], reverse=True)

    elapsed = time.time() - start_time
    scan_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    output = {
        "scan_time": scan_time,
        "elapsed_seconds": round(elapsed),
        "total_scanned": total,
        "total_matched": len(results),
        "conditions": {
            "volume_threshold": VOLUME_THRESHOLD,
            "volume_surge_ratio": VOLUME_SURGE_RATIO,
            "kd_period": KD_PERIOD,
        },
        "results": results,
    }

    # 確保輸出目錄存在
    os.makedirs(DATA_DIR, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("")
    print("=" * 60)
    print(f"✅ 掃描完成！")
    print(f"   掃描股票數: {total}")
    print(f"   符合條件: {len(results)} 檔")
    print(f"   耗時: {int(elapsed // 60)} 分 {int(elapsed % 60)} 秒")
    print(f"   結果已儲存至: {OUTPUT_FILE}")
    print("=" * 60)

    # 印出結果摘要
    if results:
        print("\n📈 符合條件的股票：")
        print(f"{'代碼':>6} {'名稱':<8} {'收盤':>8} {'成交量':>8} {'量增':>6} {'K值':>6} {'D值':>6}")
        print("-" * 60)
        for r in results:
            print(f"{r['code']:>6} {r['name']:<8} {r['close']:>8.2f} "
                  f"{r['volume']:>7}張 {r['volume_ratio']:>5.1f}x "
                  f"{r['k']:>6.1f} {r['d']:>6.1f}")
    else:
        print("\n📭 今日沒有符合條件的股票")


if __name__ == "__main__":
    run_scan()
