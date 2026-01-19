# Daily QuestMon (每日怪獸挑戰)

A Pokemon-style gamified daily chore tracker for children with parent controls.

## Features

### 👾 Child View (Player Mode)
- View daily quests as "monsters" to defeat
- Click quest cards to complete them with shake and flash animations
- Track progress with Pokemon-style HP bar
- See total points earned

### 🛡️ Parent View (Admin Mode)
- Add, edit, and delete daily quests
- Customize quest icons with emoji picker
- Set reward points for each quest
- Enable/disable quests

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom Pokemon theme
- **State Management**: TanStack Query (React Query)
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Font**: Press Start 2P (Google Fonts)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API to get your credentials
3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3. Initialize Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Run the SQL to create tables and seed data

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

### Switching Roles

Use the buttons in the top-right corner to switch between:
- **玩家 (Player)**: Child view for completing quests
- **家長 (Parent)**: Admin view for managing quests

### Child Mode

1. View all active quests for the day
2. Click on a quest card to "defeat" the monster
3. Watch the shake animation as you battle!
4. See your progress bar fill up
5. Earn points for each completed quest

### Parent Mode

1. Click "新增任務" to add a new quest
2. Fill in quest details (name, description, icon, points, status)
3. Edit or delete existing quests using the action buttons

## Project Structure

```
daily-questmon/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Main page components
│   ├── hooks/           # React Query hooks
│   ├── contexts/        # React contexts
│   ├── lib/             # Utilities and configs
│   └── types/           # TypeScript types
├── supabase/
│   └── schema.sql       # Database schema
└── public/              # Static assets
```

## Design Philosophy

### Pokemon-Inspired Aesthetics

- **Color Palette**: Pokeball Red (#FF0000), HP Green (#4CAF50), Deep Black (#222222)
- **Typography**: Press Start 2P pixel font
- **Components**: Thick black borders, no rounded corners
- **Animations**: Shake on click, flash on completion

## Future Enhancements

- User authentication with multiple child profiles
- Quest verification workflow (parent approval)
- Weekly/monthly statistics
- Reward redemption system
- Sound effects for quest completion

## License

MIT
