import { useRef, useEffect, useState } from "react";
import axios from "axios";

export default function VideoPlayer({
  videoUrl,
  hasAccess,
  lectureTitle,
  courseId,
  lectureIndex,
  onLectureComplete,
  onVideoEnded,
}) {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPreviewWarning, setShowPreviewWarning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showProtectionOverlay, setShowProtectionOverlay] = useState(false);
  // const [markingComplete, setMarkingComplete] = useState(false);
  
  // Check if this is the first lecture (index 0)
  const isFirstLecture = lectureIndex === 0;
  // Allow full access if user is enrolled OR if this is the first lecture
  const canPlayFully = hasAccess || isFirstLecture;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Call onVideoEnded callback when video finishes
      if (onVideoEnded) {
        onVideoEnded();
      }
    };

    const handleContextMenu = (e) => {
      // Prevent right-click menu on video
      if (canPlayFully) {
        e.preventDefault();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("contextmenu", handleContextMenu);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [onVideoEnded]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
      // Show protection overlay periodically when playing
      setShowProtectionOverlay(true);
      const timer = setTimeout(() => setShowProtectionOverlay(false), 30000); // Hide after 30 seconds
      return () => clearTimeout(timer);
    }
  };

  // Disable keyboard shortcuts that could trigger recording (F11, Ctrl+Shift+S, Print Screen, etc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent common screen recording shortcuts
      if (
        (e.key === "F11") ||
        (e.ctrlKey && e.shiftKey && e.key === "S") ||
        (e.key === "PrintScreen") ||
        (e.ctrlKey && e.key === "s") // Prevent save
      ) {
        e.preventDefault();
      }
    };

    if (canPlayFully && isPlaying) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [canPlayFully, isPlaying]);

  // const markAsCompleted = async () => {
  //   // Only allow marking complete for enrolled users and only on first lecture or later
  //   if (!hasAccess || !courseId || lectureIndex === undefined) {
  //     return;
  //   }

  //   try {
  //     setMarkingComplete(true);
  //     const token = localStorage.getItem("token");

  //     await axios.post(
  //       `http://localhost:5000/api/student/courses/${courseId}/lectures/${lectureIndex}/complete`,
  //       {},
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }
  //     );

  //     setIsCompleted(true);

  //     // Notify parent component
  //     if (onLectureComplete) {
  //       onLectureComplete(lectureIndex);
  //     }

  //     setMarkingComplete(false);
  //   } catch (err) {
  //     console.error("Error marking lecture as completed:", err);
  //     setMarkingComplete(false);
  //   }
  // };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleProgressBarClick = (e) => {
    if (!videoRef.current) return;

    // Allow seeking only if user has full access
    if (!canPlayFully) {
      return;
    }

    const progressBar = e.currentTarget;
    const clickX = e.clientX - progressBar.getBoundingClientRect().left;
    const percentage = clickX / progressBar.offsetWidth;
    videoRef.current.currentTime = percentage * duration;
  };

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden">
      {/* Video Container */}
      <div className="relative w-full bg-black aspect-video select-none">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full pointer-events-none"
          controlsList="nodownload nofullscreen"
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Play Button Overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-all group"
          >
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-white bg-opacity-80 group-hover:bg-opacity-100 transition-all">
              <svg
                className="w-8 h-8 text-black ml-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </button>
        )}

        {/* Screen Recording Protection Overlay (icon-only, no text) */}
        {showProtectionOverlay && isPlaying && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="opacity-0 select-none" aria-hidden="true"></div>
          </div>
        )}

        {/* Preview Warning Overlay - icon-only (no text) */}
        {!canPlayFully && !isFirstLecture && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" aria-hidden="true">
            <div className="opacity-0 select-none"></div>
          </div>
        )}

        {/* Preview Badge for Lecture 1 (icon-only) */}
        {isFirstLecture && !hasAccess && (
          <div className="absolute top-4 right-4 bg-green-600 w-8 h-8 rounded-full" aria-label="Free preview" />
        )}

        {/* Locked Badge for other lectures without access (icon-only) */}
        {!canPlayFully && !isFirstLecture && (
          <div className="absolute top-4 right-4 bg-red-600 w-8 h-8 rounded-full" aria-label="Locked" />
        )}
      </div>

      {/* Video Controls */}
      <div className="bg-gray-900 p-4 text-white">
        {/* Progress Bar */}
        <div
          className="w-full h-1 bg-gray-700 rounded-full mb-4 cursor-not-allowed opacity-75 transition-all"
        >
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
            }}
          ></div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="hover:text-blue-400 transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 012-2h6a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              )}
            </button>

            {/* Time Display */}
            <div className="text-sm font-mono">
              <span>{formatTime(currentTime)}</span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-gray-500">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Fullscreen Button */}
          <div
            className="cursor-not-allowed opacity-50"
            title="Fullscreen is disabled for content protection"
          >
            <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm12 0a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L12.586 5H11a1 1 0 010-2h4zM3 16a1 1 0 01-1-1v-4a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4zm14-1a1 1 0 001-1v-4a1 1 0 00-2 0v1.586l-2.293-2.293a1 1 0 00-1.414 1.414L13.586 15H12a1 1 0 000 2h4z" />
            </svg>
          </div>

          {/* Mark Complete Button - Only for purchased courses */}
          {/* {hasAccess && (
            <button
              onClick={markAsCompleted}
              disabled={markingComplete || isCompleted}
              className={`ml-4 px-3 py-1 rounded text-sm font-semibold transition-all ${
                isCompleted
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
              }`}
              title={isCompleted ? "Lecture completed" : "Mark as completed"}
            >
              {isCompleted ? (
                <>
                  <svg
                    className="w-4 h-4 inline mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Done
                </>
              ) : (
                <>
                  {markingComplete ? "Saving..." : "Mark Complete"}
                </>
              )}
            </button>
          )} */}
        </div>

        {/* Lecture Title */}
        {lectureTitle && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              📺 {lectureTitle}
            </p>
            {isCompleted && (
              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Completed
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
