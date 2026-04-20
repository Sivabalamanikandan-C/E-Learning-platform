import { useState } from "react";
import axios from "axios";

export default function CreateCourse() {
  const getDefaultQuestion = () => ({
    questionText: "",
    points: 0,
    questionType: "single",
    options: [
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false },
    ],
  });
  const [activeTab, setActiveTab] = useState("landing");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });

  const [course, setCourse] = useState({
    title: "",
    category: "",
    level: "",
    language: "",
    subtitle: "",
    description: "",
    price: 0,
    thumbnail: "",
    lectures: [{ title: "", freePreview: true, videoUrl: "" }],
    quiz: {
      title: "",
      description: "",
      timeLimit: 0,
      questions: [getDefaultQuestion()],
    },
  });

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || import.meta.env.VITE_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || import.meta.env.VITE_CLOUD_UPLOAD_PRESET || "course_upload";

  /* ---------- IMAGE UPLOAD ---------- */
  const uploadImage = async (file) => {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", uploadPreset);

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        form
      );

      setCourse({ ...course, thumbnail: res.data.secure_url });
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    }
  };

  /* ---------- ADD LECTURE ---------- */
  const addLecture = () => {
    setCourse({
      ...course,
      lectures: [
        ...course.lectures,
        { title: "", freePreview: course.lectures.length === 0 ? true : false, videoUrl: "" },
      ],
    });
  };

  const removeLecture = (index) => {
    // Prevent removing the first lecture (it must remain as the preview)
    if (index === 0) return;

    const updated = course.lectures.filter((_, i) => i !== index);
    // ensure first lecture is preview when any lectures remain
    if (updated.length > 0) {
      updated[0] = { ...updated[0], freePreview: true };
    }
    setCourse({ ...course, lectures: updated });
  };

  /* ---------- VIDEO UPLOAD ---------- */
  const uploadVideo = async (file, index) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        formData,
        {
          onUploadProgress: (e) => {
            const percent = Math.round((e.loaded * 100) / e.total);
            setUploadProgress({ ...uploadProgress, [index]: percent });
          },
        }
      );

      const url = res.data.secure_url;
      const lectures = [...course.lectures];
      lectures[index] = { ...lectures[index], videoUrl: url };
      setCourse({ ...course, lectures });
      setUploadProgress({ ...uploadProgress, [index]: 100 });
      return url;
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Video upload failed" });
      setUploadProgress({ ...uploadProgress, [index]: 0 });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  /* ---------- TAB VALIDATION ---------- */
  const isCurriculumComplete = () => {
    return course.lectures.length > 0 &&
      course.lectures.every(l => l.title.trim() && l.videoUrl);
  };

  const isLandingPageComplete = () => {
    return course.title.trim() &&
      course.category &&
      course.level &&
      course.language &&
      course.subtitle.trim() &&
      course.description.trim() &&
      course.price > 0 &&
      course.thumbnail;
  };

  const isQuizComplete = () => {
    if (!course.quiz.title.trim() || !course.quiz.description.trim()) {
      return false;
    }
    if (course.quiz.timeLimit <= 0) {
      return false;
    }
    if (course.quiz.questions.length === 0) {
      return false;
    }
    return course.quiz.questions.every(q =>
      q.questionText.trim() &&
      q.points > 0 &&
      q.questionType &&
      q.options.length >= 2 &&
      q.options.every(o => o.optionText.trim()) &&
      q.options.some(o => o.isCorrect)
    );
  };

  /* ---------- VALIDATION ---------- */
  const validateCourse = () => {
    if (!isLandingPageComplete()) {
      return "Course Landing Page tab must be completed: Title, Category, Level, Language, Subtitle, Description, Price, and Thumbnail are all required";
    }
    if (!isCurriculumComplete()) {
      return "Curriculum tab must be completed: At least one lecture with title and video is required";
    }
    return null;
  };

  /* ---------- QUIZ FUNCTIONS ---------- */
  const addQuestion = () => {
    setCourse({
      ...course,
      quiz: {
        ...course.quiz,
        questions: [...course.quiz.questions, getDefaultQuestion()],
      },
    });
  };

  const removeQuestion = (index) => {
    const updatedQuestions = course.quiz.questions.filter((_, i) => i !== index);
    setCourse({
      ...course,
      quiz: { ...course.quiz, questions: updatedQuestions },
    });
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...course.quiz.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setCourse({
      ...course,
      quiz: { ...course.quiz, questions: updatedQuestions },
    });
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...course.quiz.questions];
    // Prevent adding more than 4 options per question
    if (updatedQuestions[questionIndex].options.length >= 4) return;
    updatedQuestions[questionIndex].options.push({ optionText: "", isCorrect: false });
    setCourse({
      ...course,
      quiz: { ...course.quiz, questions: updatedQuestions },
    });
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...course.quiz.questions];
    updatedQuestions[questionIndex].options = updatedQuestions[questionIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    setCourse({
      ...course,
      quiz: { ...course.quiz, questions: updatedQuestions },
    });
  };

  const updateOption = (questionIndex, optionIndex, field, value) => {
    const updatedQuestions = [...course.quiz.questions];
    updatedQuestions[questionIndex].options[optionIndex] = {
      ...updatedQuestions[questionIndex].options[optionIndex],
      [field]: value,
    };
    setCourse({
      ...course,
      quiz: { ...course.quiz, questions: updatedQuestions },
    });
  };

  const updateQuizHeader = (field, value) => {
    setCourse({
      ...course,
      quiz: { ...course.quiz, [field]: value },
    });
  };

  /* ---------- SUBMIT COURSE ---------- */
  const submitCourse = async () => {
    const error = validateCourse();
    if (error) {
      setMessage({ type: "error", text: error });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        "http://localhost:5000/api/instructor/create-course",
        course,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setMessage({ type: "success", text: "Course created successfully" });
      setCourse({
        title: "",
        category: "",
        level: "",
        language: "",
        subtitle: "",
        description: "",
        price: 0,
        thumbnail: "",
        lectures: [{ title: "", freePreview: true, videoUrl: "" }],
        quiz: {
          title: "",
          description: "",
          timeLimit: 0,
          questions: [getDefaultQuestion()],
        },
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Course creation failed";
      setMessage({ type: "error", text: errorMsg });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white p-6 rounded shadow">
        {/* MESSAGE ALERT */}
        {message.text && (
          <div
            className={`mb-4 p-4 rounded ${message.type === "success"
                ? "bg-green-100 border border-green-400 text-green-700"
                : "bg-red-100 border border-red-400 text-red-700"
              }`}
          >
            {message.text}
          </div>
        )}

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Create a new course</h1>
          <button
            onClick={submitCourse}
            disabled={loading}
            className="bg-gray-700 text-white px-6 py-2 rounded disabled:bg-gray-400"
          >
            {loading ? "Submitting..." : "SUBMIT"}
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-4 border-b mb-6">
          <button
            onClick={() => setActiveTab("landing")}
            className={`flex items-center gap-2 pb-2 ${activeTab === "landing" ? "font-bold border-b-2 border-gray-700" : ""
              } ${isLandingPageComplete() ? "text-green-600" : "text-gray-700"}`}
          >
            Course Landing Page
            {isLandingPageComplete() && <span className="text-green-600">✓</span>}
            {!isLandingPageComplete() && <span className="text-red-600">●</span>}
          </button>
          <button
            onClick={() => setActiveTab("curriculum")}
            className={`flex items-center gap-2 pb-2 ${activeTab === "curriculum" ? "font-bold border-b-2 border-gray-700" : ""
              } ${isCurriculumComplete() ? "text-green-600" : "text-gray-700"}`}
          >
            Curriculum
            {isCurriculumComplete() && <span className="text-green-600">✓</span>}
            {!isCurriculumComplete() && <span className="text-red-600">●</span>}
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`flex items-center gap-2 pb-2 ${activeTab === "quiz" ? "font-bold border-b-2 border-gray-700" : ""
              } ${isQuizComplete() ? "text-green-600" : "text-gray-700"}`}
          >
            Quiz
            {isQuizComplete() && <span className="text-green-600">✓</span>}
            {!isQuizComplete() && <span className="text-red-600">●</span>}
          </button>
        </div>

        {/* TAB 1: LANDING PAGE */}
        {activeTab === "landing" && (
          <div className="space-y-4">
            <input
              placeholder="Title"
              className="border border-black rounded-md p-2 w-full"
              value={course.title}
              onChange={(e) =>
                setCourse({ ...course, title: e.target.value })
              }
            />

            <select
              className="border  border-black rounded-md p-2 w-full"
              value={course.category}
              onChange={(e) =>
                setCourse({ ...course, category: e.target.value })
              }
            >
              <option value="">Category</option>
              <option>Web Development</option>
              <option>Programming Language</option>
              <option>Digital Marketing</option>
              <option>AI</option>
              <option>Data Science</option>
              <option>Database</option>
              <option>MS office</option>
            </select>

            <select
              className="border  border-black rounded-md p-2 w-full"
              value={course.level}
              onChange={(e) =>
                setCourse({ ...course, level: e.target.value })
              }
            >
              <option value="">Level</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>

            <select
              className="border  border-black rounded-md p-2 w-full"
              value={course.language}
              onChange={(e) =>
                setCourse({ ...course, language: e.target.value })
              }
            >
              <option value="">Primary Language</option>
              <option>English</option>
              <option>Tamil</option>
              <option>Hindi</option>
            </select>

            <input
              placeholder="Subtitle"
              className="border  border-black rounded-md p-2 w-full"
              value={course.subtitle}
              onChange={(e) =>
                setCourse({ ...course, subtitle: e.target.value })
              }
            />

            <textarea
              placeholder="Description"
              className="border  border-black rounded-md p-2 w-full"
              rows={4}
              value={course.description}
              onChange={(e) =>
                setCourse({ ...course, description: e.target.value })
              }
            />

            {/* Price */}
            <div>
              <label className="block  border-black rounded-md text-sm font-medium text-black mb-1">
                Course Price (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 999"
                className="w-full  border-black rounded-md border px-4 py-3"
                value={course.price}
                onChange={(e) =>
                  setCourse({ ...course, price: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Course Thumbnail
              </label>

              <div className="border-2 border-dashed  rounded-xl p-6 text-center hover:border-blue-600 transition">
                <input
                  type="file"
                  id="thumbnailUpload"
                  hidden
                  accept="image/*"
                  onChange={(e) => uploadImage(e.target.files[0])}
                />

                <label
                  htmlFor="thumbnailUpload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xl">
                    📷
                  </div>
                  <p className="text-indigo-600 font-medium">
                    Click to upload thumbnail
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG / PNG • Recommended 1280×720
                  </p>
                </label>

                {course.thumbnail && (
                  <div className="mt-5">
                    <img
                      src={course.thumbnail}
                      alt="Thumbnail Preview"
                      className="mx-auto w-64 rounded-lg shadow-md border"
                    />
                    <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                      ✅ Thumbnail uploaded
                    </p>

                    <button
                      type="button"
                      onClick={() => setCourse({ ...course, thumbnail: "" })}
                      className="text-sm px-3 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50 mt-4"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: CURRICULUM */}
        {activeTab === "curriculum" && (
  <div>
    {course.lectures.map((l, i) => (
      <div
        key={i}
        className="border p-4 mb-4 rounded-lg bg-white shadow-sm"
      >
        {/* Lecture Title + Cancel Button */}
        <div className="flex items-center gap-3 mb-4">
          <input
            placeholder="Lecture Title"
            className="border p-2 w-full rounded"
            value={l.title}
            onChange={(e) => {
              const lectures = [...course.lectures];
              lectures[i].title = e.target.value;
              setCourse({ ...course, lectures });
            }}
          />

          {i !== 0 && (
            <button
              onClick={() => removeLecture(i)}
              className="px-3 py-2.5 text-sm rounded-md bg-red-500 text-white hover:bg-red-600"
              title="Cancel lecture"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Free Preview */}
        {i === 0 ? (
          <label className="flex items-center gap-3 mb-4 p-3 border rounded-lg bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={true}
              disabled
              className="w-4 h-4 accent-blue-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">
                Free Preview
              </p>
              <p className="text-xs text-gray-500">
                First lecture is always free preview
              </p>
            </div>
          </label>
        ) : (
          <div className="mb-3 p-3 border rounded-lg bg-gray-50">
            <p className="text-sm text-gray-500">
              🔒 Free Preview is only available for the first lecture
            </p>
          </div>
        )}

        {/* Video Upload UI */}
        <div className="border-2 border-dashed border-black rounded-lg p-4 text-center hover:border-blue-600 transition">
          <input
            type="file"
            accept="video/*"
            id={`videoUpload-${i}`}
            hidden
            onChange={(e) => uploadVideo(e.target.files[0], i)}
          />

          <label
            htmlFor={`videoUpload-${i}`}
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-100 text-xl">
              🎥
            </div>
            <p className="text-blue-600 font-medium">
              Click to upload video
            </p>
            <p className="text-xs text-gray-500">
              MP4, Etc... supported
            </p>
          </label>
        </div>

        {/* Upload Progress */}
        {uploadProgress[i] && uploadProgress[i] < 100 && (
          <div className="mt-3">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">
                Uploading video...
              </span>
              <span className="text-sm font-medium">
                {uploadProgress[i]}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress[i]}%` }}
              />
            </div>
          </div>
        )}

        {/* Uploaded Video Preview */}
        {l.videoUrl && (
          <div className="mt-3">
            <p className="text-sm text-green-600 mb-2">
              ✓ Video uploaded {i === 0 && "(Preview video)"}
            </p>
            <video
              src={l.videoUrl}
              controls
              className="w-96 rounded border"
            />
          </div>
        )}
      </div>
    ))}

    {/* Add Lecture Button */}
    <button
      onClick={addLecture}
      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded mt-4"
    >
      Add Lecture
    </button>
  </div>
)}


        {/* TAB 3: QUIZ */}
        {activeTab === "quiz" && (
          <div className="space-y-6">
            {/* Quiz Header Section */}
            <div className="border p-4 rounded bg-gray-50">
              <h2 className="text-lg font-semibold mb-4">Quiz Header</h2>

              <input
                placeholder="Quiz Title"
                value={course.quiz.title}
                onChange={(e) => updateQuizHeader("title", e.target.value)}
                className="border p-2 w-full mb-4"
              />

              <textarea
                placeholder="Quiz Description"
                value={course.quiz.description}
                onChange={(e) => updateQuizHeader("description", e.target.value)}
                className="border p-2 w-full mb-4"
                rows={3}
              />

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Time Limit (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={course.quiz.timeLimit}
                    onChange={(e) => updateQuizHeader("timeLimit", Number(e.target.value))}
                    className="border p-2 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Availability dates removed */}
              </div>
            </div>

            {/* Question Builder Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Question Builder</h2>
                <button
                  onClick={addQuestion}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  + Add Question
                </button>
              </div>

              {course.quiz.questions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No questions added yet. Click "Add Question" to start building your quiz.</p>
              ) : (
                course.quiz.questions.map((question, qIndex) => (
                  <div key={qIndex} className="border p-4 mb-4 rounded bg-white shadow">
                    {/* Question Header */}
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">Question {qIndex + 1}</h3>
                      <button
                        onClick={() => removeQuestion(qIndex)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Remove Question
                      </button>
                    </div>

                    {/* Question Text */}
                    <textarea
                      placeholder="Question Text"
                      value={question.questionText}
                      onChange={(e) => updateQuestion(qIndex, "questionText", e.target.value)}
                      className="border p-2 w-full mb-4"
                      rows={3}
                    />

                    {/* Points and Question Type */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Points</label>
                        <input
                          type="number"
                          min="0"
                          value={question.points}
                          onChange={(e) => updateQuestion(qIndex, "points", Number(e.target.value))}
                          className="border p-2 w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Question Type</label>
                        <select
                          value={question.questionType}
                          onChange={(e) => updateQuestion(qIndex, "questionType", e.target.value)}
                          className="border p-2 w-full"
                        >
                          <option value="single">Single Choice</option>
                          <option value="multiple">Multiple Choice</option>
                        </select>
                      </div>
                    </div>

                    {/* Options Section */}
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold">Options</h4>
                        <button
                          onClick={() => addOption(qIndex)}
                          disabled={question.options.length >= 4}
                          className={`bg-green-600 text-white px-3 py-1 rounded text-sm ${question.options.length >= 4 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                          title={question.options.length >= 4 ? 'Maximum 4 options allowed' : 'Add option'}
                        >
                          + Add Option
                        </button>
                      </div>

                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex gap-3 mb-3 items-start">
                          <div className="flex-1">
                            <input
                              placeholder={`Option ${oIndex + 1}`}
                              value={option.optionText}
                              onChange={(e) => updateOption(qIndex, oIndex, "optionText", e.target.value)}
                              className="border p-2 w-full"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={option.isCorrect}
                                onChange={(e) => updateOption(qIndex, oIndex, "isCorrect", e.target.checked)}
                              />
                              <span className="text-sm">Correct</span>
                            </label>
                            <button
                              onClick={() => removeOption(qIndex, oIndex)}
                              className={`text-red-500 px-2 py-1 rounded text-sm ${question.options.length <= 2 ? "opacity-50 cursor-not-allowed" : "hover:bg-red-100"
                                }`}
                              disabled={question.options.length <= 2}
                              title={question.options.length <= 2 ? "Minimum 2 options required" : "Remove option"}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>

                            </button>
                          </div>
                        </div>
                      ))}

                      {question.options.length === 0 && (
                        <p className="text-gray-400 text-sm">No options added. Click "Add Option" to start.</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
