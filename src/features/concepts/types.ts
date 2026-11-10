// 概念題庫的型別。規格見 CONCEPT_BANK_SPEC.md 第 2、3 節。

export type ConceptSubject = 'chinese' | 'math' | 'english' | 'science' | 'social';
export type ConceptGrade = 2 | 3 | 4 | 5 | 6;
export const CONCEPT_GRADES: ConceptGrade[] = [2, 3, 4, 5, 6];

/** h：提示（由淺到深），e：解析（答完後顯示） */
interface QuestionBase {
    q: string;
    h?: string[];
    e?: string;
}
/** 選擇：a 正解、w 誘答 */
export interface ChoiceQuestion extends QuestionBase { type: 'choice'; a: string; w: string[] }
/** 填答：a 可以是多個可接受的答案 */
export interface InputQuestion extends QuestionBase { type: 'input'; a: string | string[] }
/** 排序：a 是正確順序 */
export interface OrderQuestion extends QuestionBase { type: 'order'; a: string[] }
/** 是非 */
export interface TrueFalseQuestion extends QuestionBase { type: 'tf'; a: boolean }

export type Question = ChoiceQuestion | InputQuestion | OrderQuestion | TrueFalseQuestion;

export interface GeneratorRef {
    id: string;
    /** 允許的難度；每次出題從中隨機挑一個 */
    difficulties: string[];
}

export interface Concept {
    id: string; // <subject>.g<grade>.<slug>
    grade: ConceptGrade;
    /** 同一年級裡的分組標題，例如「標點與字詞」 */
    unit: string;
    title: string;
    summary: string;
    curriculumCodes?: string[];
    prerequisites?: string[];
    /** 寫好的題目；與 generator 至少要有一個 */
    questions?: Question[];
    /** 由程式即時出題 */
    generator?: GeneratorRef;
}

/** content/<subject>/g<grade>.json 的內容 */
export interface GradeBank {
    subject: ConceptSubject;
    grade: ConceptGrade;
    concepts: Concept[];
}

/** 出題時帶上 key，用來記錄答錯的題目 */
export interface PlayableQuestion {
    key: string;
    question: Question;
}
