# Course Track Module

A comprehensive module for displaying student progress tracking across courses, including lectures, quizzes, and assignments.

## Directory Structure

```
modules/CourseTrack/
├── index.jsx           # Main component
├── CourseTrack.css     # Styles
├── constants.js        # Constants and configuration
├── utils.js            # Utility functions
└── README.md          # This file
```

## Features

- **Overview Tab**: Displays overall course progress with circular progress indicator
- **Lectures Tab**: Lists all lectures with individual completion status
- **Quizzes Tab**: Shows quiz details, scores, and completion information
- **Assignments Tab**: Displays assignments with submission status and grades
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop devices

## Usage

### Import

```jsx
import CourseTrack from "./modules/CourseTrack";
```

### Route Configuration

```jsx
<Route path="course-track/:courseId" element={<CourseTrack />} />
```

### Navigation

```jsx
// Navigate to course track
navigate(`/student/course-track/${courseId}`);
```

## API Endpoints Used

### GET /api/student/courses/:courseId
Fetches course details including lectures and quiz information.

**Response:**
```json
{
  "course": {
    "_id": "course_id",
    "title": "Course Title",
    "instructor": { "name": "Instructor Name" },
    "lectures": [...],
    "quiz": {...}
  }
}
```

### GET /api/student/course/:courseId/progress
Fetches student progress data for a course.

**Response:**
```json
{
  "lectures": {
    "completed": 5,
    "total": 10,
    "percentage": 50
  },
  "quiz": {
    "completed": true,
    "hasQuiz": true,
    "score": 80,
    "totalPoints": 100,
    "percentage": 80,
    "completionDate": "2024-01-15"
  },
  "assignments": {
    "submitted": 3,
    "total": 5,
    "submissionPercentage": 60
  },
  "overallProgress": 65
}
```

### GET /api/student/course/:courseId/assignments
Fetches all assignments with student submission details.

**Response:**
```json
{
  "assignments": [
    {
      "_id": "assignment_id",
      "title": "Assignment Title",
      "instructions": "...",
      "dueDate": "2024-01-20",
      "maxMarks": 100,
      "submission": {
        "status": "graded",
        "obtainedMarks": 85,
        "feedback": "Good work!",
        "submissionDate": "2024-01-18"
      }
    }
  ]
}
```

### GET /api/student/course/:courseId/lectures-progress
Fetches detailed progress for each lecture.

**Response:**
```json
{
  "lecturesProgress": {
    "0": { "isCompleted": true, "completedAt": "2024-01-10" },
    "1": { "isCompleted": false, "completedAt": null }
  }
}
```

## Component Props

The CourseTrack component is route-based and uses `useParams` to get the courseId from the URL.

**URL Parameter:**
- `courseId`: The ID of the course to display progress for

## State Management

### States

- `courseData`: Course information (title, instructor, lectures, quiz)
- `progressData`: Student progress data (lectures, quiz, assignments, overall)
- `lecturesList`: Array of lectures for the course
- `lecturesProgress`: Map of lecture index to completion status
- `quizzesList`: Array of quizzes (typically one per course)
- `assignmentsList`: Array of assignments with submissions
- `loading`: Loading state
- `error`: Error state
- `activeTab`: Currently active tab

## Constants

### TABS
- `OVERVIEW`: Overview tab
- `LECTURES`: Lectures tab
- `QUIZZES`: Quizzes tab
- `ASSIGNMENTS`: Assignments tab

### STATUS
- `NOT_SUBMITTED`: Assignment not submitted
- `SUBMITTED`: Assignment submitted
- `GRADED`: Assignment graded

### API_ENDPOINTS
Centralized API endpoint URLs for all API calls.

## Utility Functions

### formatDate(date)
Formats a date to locale string.

### getStatusVariant(status)
Returns CSS class variant based on assignment status.

### calculatePercentage(current, total)
Calculates percentage between current and total values.

### isLectureCompleted(lectureProgressData)
Checks if a lecture is completed.

### getSubmissionDetails(assignment)
Extracts submission details from an assignment object.

## Styling

All styles are contained in `CourseTrack.css` with:
- BEM naming convention
- Mobile-first responsive design
- Accessible color contrasts
- Smooth transitions and animations

### Key Classes

- `.course-track-container`: Main container
- `.tab-navigation`: Tab navigation bar
- `.summary-grid`: Overview grid layout
- `.lectures-list`: Lectures list container
- `.quizzes-list`: Quizzes list container
- `.assignments-list`: Assignments list container

## Error Handling

The component handles:
- Loading states with spinner
- Network errors
- Missing course data
- Unauthenticated users (via API auth headers)
- Empty states for lists

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers
- iOS Safari
- Android Chrome

## Performance Considerations

- Parallel API calls for course and progress data
- Optimized re-renders using React hooks
- CSS animations use GPU acceleration
- Responsive images and lazy loading ready
