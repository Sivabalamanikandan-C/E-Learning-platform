import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function EditCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.token;

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
  const [initialLoading, setInitialLoading] = useState(true);
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

  /* ---------- FETCH EXISTING COURSE ---------- */
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setInitialLoading(true);
        const res = await axios.get(
          `http://localhost:5000/api/instructor/${courseId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setCourse(res.data);
        setMessage({ type: "success", text: "Course loaded successfully" });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } catch (err) {
        console.error("Error fetching course:", err);
        const errorMsg = err.response?.data?.message || "Failed to load course";
        setMessage({ type: "error", text: errorMsg });
        setTimeout(() => {
          if (err.response?.status === 401 || err.response?.status === 403) {
            auth.logout();
            navigate("/login", { replace: true });
          }
        }, 1500);
      } finally {
        setInitialLoading(false);
      }
    };

    if (token) {
      fetchCourse();
    }
  }, [courseId, token]);

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
      setMessage({ type: "success", text: "Thumbnail uploaded successfully" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Image upload failed" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
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
    if (index === 0) return;

    const updated = course.lectures.filter((_, i) => i !== index);
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

      const updated = course.lectures.map((l, i) =>
        i === index ? { ...l, videoUrl: res.data.secure_url } : l
      );
      setCourse({ ...course, lectures: updated });
      setMessage({ type: "success", text: `Video ${index + 1} uploaded successfully` });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Video upload failed" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  /* ---------- UPDATE LECTURE ---------- */
  const updateLecture = (index, field, value) => {
    const updated = course.lectures.map((l, i) =>
      i === index ? { ...l, [field]: value } : l
    );
    setCourse({ ...course, lectures: updated });
  };

  /* ---------- ADD QUESTION ---------- */
  const addQuestion = () => {
    setCourse({
      ...course,
      quiz: {
        ...course.quiz,
        questions: [...course.quiz.questions, getDefaultQuestion()],
      },
    });
  };

  const removeQuestion = (questionIndex) => {
    const updatedQuestions = course.quiz.questions.filter((_, i) => i !== questionIndex);
    setCourse({
      ...course,
      quiz: { ...course.quiz, questions: updatedQuestions },
    });
  };

  const updateQuestion = (questionIndex, field, value) => {
    const updatedQuestions = [...course.quiz.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      [field]: value,
    };
    setCourse({
      ...course,
      quiz: { ...course.quiz, questions: updatedQuestions },
    });
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...course.quiz.questions];
    updatedQuestions[questionIndex].options.push({
      optionText: "",
      isCorrect: false,
    });
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

  /* ---------- VALIDATE COURSE ---------- */
  const validateCourse = () => {
    if (!course.title.trim()) return "Title is required";
    if (!course.category.trim()) return "Category is required";
    if (!course.level.trim()) return "Level is required";
    if (!course.description.trim()) return "Description is required";
    if (course.lectures.length === 0) return "At least one lecture is required";
    for (let i = 0; i < course.lectures.length; i++) {
      if (!course.lectures[i].title.trim()) return `Lecture ${i + 1} title is required`;
      if (!course.lectures[i].videoUrl.trim()) return `Lecture ${i + 1} video URL is required`;
    }
    return null;
  };

  /* ---------- UPDATE COURSE ---------- */
  const updateCourse = async () => {
    const error = validateCourse();
    if (error) {
      setMessage({ type: "error", text: error });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `http://localhost:5000/api/instructor/update-course/${courseId}`,
        course,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage({ type: "success", text: "Course updated successfully" });
      setTimeout(() => {
        setMessage({ type: "", text: "" });
        navigate("/instructor/my-courses");
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Course update failed";
      setMessage({ type: "error", text: errorMsg });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
    setLoading(false);
  };

  if (initialLoading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded shadow text-center">
          <p className="text-lg font-semibold text-gray-700">Loading course...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-semibold">Edit Course</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/instructor/my-courses")}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={updateCourse}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-blue-400 hover:bg-blue-700"
            >
              {loading ? "Updating..." : "Update Course"}
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-6 border-b border-gray-300">
          {["landing", "lectures", "quiz"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-4 font-semibold capitalize transition ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* LANDING PAGE TAB */}
        {activeTab === "landing" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Title</label>
              <input
                type="text"
                value={course.title}
                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="Course title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Category</label>
                <input
                  type="text"
                  value={course.category}
                  onChange={(e) => setCourse({ ...course, category: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2"
                  placeholder="e.g., Web Development"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Level</label>
                <select
                  value={course.level}
                  onChange={(e) => setCourse({ ...course, level: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2"
                >
                  <option value="">Select level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Language</label>
              <input
                type="text"
                value={course.language}
                onChange={(e) => setCourse({ ...course, language: e.target.value })}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="e.g., English"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Subtitle</label>
              <input
                type="text"
                value={course.subtitle}
                onChange={(e) => setCourse({ ...course, subtitle: e.target.value })}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="Brief subtitle"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <textarea
                value={course.description}
                onChange={(e) => setCourse({ ...course, description: e.target.value })}
                className="w-full border border-gray-300 rounded p-2 h-24"
                placeholder="Detailed course description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Price (₹)</label>
                <input
                  type="number"
                  value={course.price}
                  onChange={(e) => setCourse({ ...course, price: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded p-2"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Thumbnail</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadImage(e.target.files[0])}
                    className="flex-1 border border-gray-300 rounded p-2"
                  />
                </div>
                {course.thumbnail && (
                  <img src={course.thumbnail} alt="Thumbnail" className="mt-2 h-20 rounded" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* LECTURES TAB */}
        {activeTab === "lectures" && (
          <div className="space-y-4">
            {course.lectures.map((lecture, index) => (
              <div key={index} className="border border-gray-300 rounded p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Lecture {index + 1}</h3>
                  {index !== 0 && (
                    <button
                      onClick={() => removeLecture(index)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Title</label>
                    <input
                      type="text"
                      value={lecture.title}
                      onChange={(e) => updateLecture(index, "title", e.target.value)}
                      className="w-full border border-gray-300 rounded p-2"
                      placeholder="Lecture title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Video URL</label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => uploadVideo(e.target.files[0], index)}
                        className="flex-1 border border-gray-300 rounded p-2"
                      />
                    </div>
                    {uploadProgress[index] && (
                      <div className="mt-2 bg-gray-200 rounded h-2">
                        <div
                          className="bg-blue-600 h-2 rounded transition-all"
                          style={{ width: `${uploadProgress[index]}%` }}
                        />
                      </div>
                    )}
                    {lecture.videoUrl && (
                      <p className="text-sm text-green-600 mt-2">✓ Video uploaded</p>
                    )}
                  </div>

                  {/* Free Preview */}
                  {index === 0 ? (
                    <label className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="rounded w-4 h-4 accent-blue-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Free Preview</p>
                        <p className="text-xs text-gray-500">First lecture is always free preview</p>
                      </div>
                    </label>
                  ) : (
                    <div className="mb-3 p-3 border rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-500">
                        🔒 Free Preview is only available for the first lecture
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={addLecture}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
            >
              Add Lecture
            </button>
          </div>
        )}

        {/* QUIZ TAB */}
        {activeTab === "quiz" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Quiz Title</label>
              <input
                type="text"
                value={course.quiz.title}
                onChange={(e) => updateQuizHeader("title", e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="Quiz title"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Quiz Description</label>
              <textarea
                value={course.quiz.description}
                onChange={(e) => updateQuizHeader("description", e.target.value)}
                className="w-full border border-gray-300 rounded p-2 h-20"
                placeholder="Quiz description"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Time Limit (minutes)</label>
              <input
                type="number"
                value={course.quiz.timeLimit}
                onChange={(e) => updateQuizHeader("timeLimit", parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="0 for no limit"
              />
            </div>

            {/* QUESTIONS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Questions</h3>
              {course.quiz.questions.map((question, qindex) => (
                <div key={qindex} className="border border-gray-300 rounded p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold">Question {qindex + 1}</h4>
                    {course.quiz.questions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(qindex)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Question Text</label>
                      <textarea
                        value={question.questionText}
                        onChange={(e) => updateQuestion(qindex, "questionText", e.target.value)}
                        className="w-full border border-gray-300 rounded p-2"
                        placeholder="Enter question text"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Points</label>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => updateQuestion(qindex, "points", parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded p-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">Type</label>
                        <select
                          value={question.questionType}
                          onChange={(e) => updateQuestion(qindex, "questionType", e.target.value)}
                          className="w-full border border-gray-300 rounded p-2"
                        >
                          <option value="single">Single Choice</option>
                          <option value="multiple">Multiple Choice</option>
                          <option value="trueFalse">True/False</option>
                        </select>
                      </div>
                    </div>

                    {/* OPTIONS */}
                    <div className="space-y-2">
                      <h5 className="font-semibold text-sm">Options</h5>
                      {question.options.map((option, oindex) => (
                        <div key={oindex} className="flex gap-2 bg-white p-2 rounded border border-gray-200">
                          <input
                            type="text"
                            value={option.optionText}
                            onChange={(e) =>
                              updateOption(qindex, oindex, "optionText", e.target.value)
                            }
                            className="flex-1 border border-gray-300 rounded p-1 text-sm"
                            placeholder="Option text"
                          />
                          <input
                            type="checkbox"
                            checked={option.isCorrect}
                            onChange={(e) =>
                              updateOption(qindex, oindex, "isCorrect", e.target.checked)
                            }
                            title="Mark as correct"
                            className="rounded"
                          />
                          {question.options.length > 2 && (
                            <button
                              onClick={() => removeOption(qindex, oindex)}
                              className="bg-red-400 text-white px-2 py-1 rounded text-xs hover:bg-red-500"
                            >
                              X
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addOption(qindex)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addQuestion}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
              >
                Add Question
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
