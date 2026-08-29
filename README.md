# Sabby Score School Management System

A comprehensive school management system built for Kenyan schools, supporting multiple curriculum types including CBE (Competency-Based Education) and 8-4-4 systems.

## Features

### Curriculum Support
- **CBE Primary** (Grades 1-6): Lower Primary (Grades 1-3) and Upper Primary (Grades 4-6)
- **CBE Junior** (Grades 7-9): Junior Secondary School
- **CBE Senior** (Grades 10-12): Senior Secondary with pathway support (STEM, Arts & Sports, Social Sciences)
- **8-4-4 System**: Full support for traditional 8-4-4 curriculum

### Key Modules
- **Student Management**: Enrollment, tracking, academic history
- **Teacher Management**: Assignments, subject allocations, workload tracking
- **Timetable Generation**: Advanced multi-strategy timetable generator with:
  - Global teacher conflict detection across all streams
  - Division-specific configurations
  - CBE Senior pathway-based scheduling
  - Room allocation and conflict detection
- **Academic Management**: Grades, streams, divisions, academic years, terms
- **Examination System**: Exam creation, mark entry, report cards
- **Fee Management**: Student fees, capitation records, payment tracking
- **Attendance Tracking**: Daily attendance monitoring
- **Performance Analytics**: Student performance analysis and reporting
- **Access Control**: Role-based permissions (Super Admin, School Admin, Teacher, Student)

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **PDF Generation**: jsPDF, html2canvas
- **Date Handling**: date-fns, react-day-picker

## Prerequisites

- Node.js 18+ (recommended to use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn or bun
- A Supabase project (for database and authentication)

## Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd shule-ya-kenya-sasa-main
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_SUPABASE_PROJECT_ID=your-supabase-project-id
```

To get these values:
1. Go to your [Supabase project settings](https://supabase.com/dashboard)
2. Navigate to Project Settings > API
3. Copy the Project URL, Anon Key, and Project Reference ID

### 4. Database Setup

The system uses Supabase migrations. Run the migrations in the following order:

```bash
# Navigate to supabase directory
cd supabase/migrations

# Apply migrations via Supabase Dashboard CLI or use the Supabase Dashboard
# Each migration file should be applied in chronological order
```

Alternatively, you can apply migrations through the Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Run each migration file in order (by date in filename)

### 5. Initialize System Data

After setting up the database, you need to initialize:
- System subjects (default subjects for each curriculum/division)
- School divisions (Lower Primary, Upper Primary, Junior Secondary, Senior Secondary, etc.)

This can be done through the application's admin interface after first login.

## Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
# or
bun dev
```

The application will be available at `http://localhost:8080`

### Production Build

```bash
npm run build
# or
yarn build
# or
bun build
```

### Preview Production Build

```bash
npm run preview
# or
yarn preview
# or
bun preview
```

## Project Structure

```
shule-ya-kenya-sasa-main/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── timetable/      # Timetable-specific components
│   │   └── ...             # Other feature components
│   ├── contexts/           # React contexts (state management)
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # External service integrations (Supabase)
│   ├── lib/                # Utility functions
│   ├── pages/              # Page components
│   ├── services/           # Business logic and API calls
│   │   ├── timetable/      # Timetable generation strategies
│   │   └── ...             # Other service modules
│   ├── types/              # TypeScript type definitions
│   └── main.tsx            # Application entry point
├── supabase/
│   └── migrations/         # Database migration files
├── public/                 # Static assets
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Timetable Generation System

The system includes a sophisticated timetable generator that supports:

### Standard Curriculum (CBE Primary/Junior, 8-4-4)
- Room-per-stream model
- Core subjects scheduled first
- Optional subjects fill remaining slots
- Teacher assignments via `teacher_subject_assignments` table

### CBE Senior Curriculum
- Track/pathway-based scheduling (STEM, Arts & Sports, Social Sciences)
- Full vs Split room modes
- Concurrent optional subject scheduling in split rooms
- Teacher assignments via `room_teacher_allocations` table
- Student overlap detection for precise conflict resolution

### Global Features
- Cross-division teacher conflict detection
- Time-range-based conflict resolution
- Division-specific timetable configurations
- Priority scheduling (busiest streams first)
- Comprehensive conflict reporting

## Authentication & Authorization

The system uses Supabase Auth with role-based access control:

- **Super Admin**: Full system access, school management
- **School Admin**: School-specific management
- **Teacher**: Class management, mark entry, attendance
- **Student**: View personal information, marks, timetable

## Deployment

### Vercel

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The application can be deployed to any platform that supports Node.js applications:
- Netlify
- Railway
- Render
- AWS Amplify
- DigitalOcean App Platform

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify your Supabase credentials in `.env` file
- Check that your Supabase project is active
- Ensure RLS policies are properly configured

**Build Errors**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

**Timetable Generation Issues**
- Ensure rooms are generated from streams in the Rooms tab
- Verify teacher assignments are set up
- Check that timetable configurations exist for divisions
- Review warnings and conflicts in generation results

## Development

### Linting

```bash
npm run lint
```

### Testing

```bash
npm run test
```

## Support

For issues, questions, or contributions, please refer to your project's issue tracker or contact the development team.

## License

This project is proprietary software. All rights reserved.
