import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../styles/InstructorMyProfile.css";

export default function InstructorMyProfile() {
  const { token, isAuthenticated, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    bio: "",
    skills: [],
    experience: 0,
    categories: [],
    profilePicture: null,
    socialLinks: {
      linkedin: "",
      github: "",
      portfolio: "",
    },
  });

  const [stats, setStats] = useState({
    totalCoursesCreated: 0,
    totalStudentsEnrolled: 0,
  });

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    skills: "",
    experience: 0,
    categories: "",
    socialLinks: {
      linkedin: "",
      github: "",
      portfolio: "",
    },
  });

  // Fetch profile on mount
  useEffect(() => {
    if (!isAuthenticated || role !== "instructor") {
      setError("Access restricted to instructors");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get("/api/instructor/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cancelled) {
          setProfileData(res.data.profile);
          setStats({
            totalCoursesCreated: res.data.totalCoursesCreated,
            totalStudentsEnrolled: res.data.totalStudentsEnrolled,
          });

          // Initialize form data
          setFormData({
            name: res.data.profile.name,
            bio: res.data.profile.bio || "",
            skills: res.data.profile.skills?.join(", ") || "",
            experience: res.data.profile.experience || 0,
            categories: res.data.profile.categories?.join(", ") || "",
            socialLinks: res.data.profile.socialLinks || {
              linkedin: "",
              github: "",
              portfolio: "",
            },
          });

          if (res.data.profile.profilePicture) {
            setPreviewImage(res.data.profile.profilePicture);
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        if (!cancelled)
          setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, role]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("social_")) {
      const socialKey = name.replace("social_", "");
      setFormData({
        ...formData,
        socialLinks: {
          ...formData.socialLinks,
          [socialKey]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setFormData({
          ...formData,
          profilePicture: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setError(null);
      setSuccess(null);

      const updateData = {
        name: formData.name,
        bio: formData.bio,
        skills: formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        experience: parseInt(formData.experience),
        categories: formData.categories
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c),
        socialLinks: formData.socialLinks,
        profilePicture: previewImage,
      };

      const res = await axios.put("/api/instructor/profile", updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfileData(res.data.profile);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.response?.data?.message || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: profileData.name,
      bio: profileData.bio || "",
      skills: profileData.skills?.join(", ") || "",
      experience: profileData.experience || 0,
      categories: profileData.categories?.join(", ") || "",
      socialLinks: profileData.socialLinks || {
        linkedin: "",
        github: "",
        portfolio: "",
      },
    });
    setPreviewImage(profileData.profilePicture);
  };

  if (loading) return <div className="imp-loading">Loading profile...</div>;
  if (!isAuthenticated)
    return <div className="imp-error">Please log in to view your profile.</div>;
  if (error) return <div className="imp-error">{error}</div>;

  return (
    <div className="imp-page">
      {/* Header */}
      <div className="imp-header">
        <h1>My Profile</h1>
        <p className="imp-sub">Manage your instructor profile and details</p>
      </div>

      {/* Success Message */}
      {success && <div className="imp-success">{success}</div>}

      {/* Main Content */}
      <div className="imp-container">
        {/* Profile Picture Section */}
        <div className="imp-picture-section">
          <div className="imp-picture-wrapper">
            {previewImage ? (
              <img src={previewImage} alt="Profile" className="imp-picture" />
            ) : (
              <div className="imp-picture-placeholder">
                <span>📷</span>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="imp-upload-section">
              <label htmlFor="picture-upload" className="imp-upload-label">
                Change Picture
              </label>
              <input
                id="picture-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="imp-file-input"
              />
            </div>
          )}
        </div>

        {/* Basic Information Section */}
        <div className="imp-section">
          <div className="imp-section-header">
            <h2>Basic Information</h2>
            {!isEditing && (
              <button
                className="imp-edit-btn"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="imp-field">
            <label>Full Name</label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="imp-input"
              />
            ) : (
              <p className="imp-value">{profileData.name}</p>
            )}
          </div>

          <div className="imp-field">
            <label>Email</label>
            <p className="imp-value imp-readonly">{profileData.email}</p>
            <small>Email cannot be changed</small>
          </div>

          <div className="imp-field">
            <label>Bio / About Me</label>
            {isEditing ? (
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                className="imp-textarea"
                placeholder="Tell us about yourself..."
                rows="4"
              />
            ) : (
              <p className="imp-value">
                {profileData.bio || "No bio added yet"}
              </p>
            )}
          </div>

          <div className="imp-field">
            <label>Experience (in years)</label>
            {isEditing ? (
              <input
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                className="imp-input"
                min="0"
              />
            ) : (
              <p className="imp-value">{profileData.experience || 0} years</p>
            )}
          </div>
        </div>

        {/* Skills & Expertise Section */}
        <div className="imp-section">
          <h2>Skills & Expertise</h2>
          <div className="imp-field">
            <label>Skills (comma-separated)</label>
            {isEditing ? (
              <input
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                className="imp-input"
                placeholder="e.g., React, Python, MongoDB, Node.js"
              />
            ) : (
              <div className="imp-tags">
                {profileData.skills && profileData.skills.length > 0 ? (
                  profileData.skills.map((skill, idx) => (
                    <span key={idx} className="imp-tag">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="imp-value">No skills added yet</p>
                )}
              </div>
            )}
          </div>

          <div className="imp-field">
            <label>Teaching Categories (comma-separated)</label>
            {isEditing ? (
              <input
                type="text"
                name="categories"
                value={formData.categories}
                onChange={handleInputChange}
                className="imp-input"
                placeholder="e.g., Web Development, Data Science, Mobile Apps"
              />
            ) : (
              <div className="imp-tags">
                {profileData.categories && profileData.categories.length > 0 ? (
                  profileData.categories.map((category, idx) => (
                    <span key={idx} className="imp-tag imp-tag-category">
                      {category}
                    </span>
                  ))
                ) : (
                  <p className="imp-value">No categories added yet</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Professional Details Section */}
        <div className="imp-section">
          <h2>Professional Details</h2>
          <div className="imp-stats-grid">
            <div className="imp-stat-card">
              <div className="imp-stat-label">Total Courses Created</div>
              <div className="imp-stat-value">{stats.totalCoursesCreated}</div>
            </div>
            <div className="imp-stat-card">
              <div className="imp-stat-label">Total Students Enrolled</div>
              <div className="imp-stat-value">{stats.totalStudentsEnrolled}</div>
            </div>
          </div>
        </div>

        {/* Social Links Section */}
        <div className="imp-section">
          <h2>Social Links (Optional)</h2>

          <div className="imp-field">
            <label>LinkedIn</label>
            {isEditing ? (
              <input
                type="url"
                name="social_linkedin"
                value={formData.socialLinks.linkedin}
                onChange={handleInputChange}
                className="imp-input"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            ) : (
              <p className="imp-value">
                {formData.socialLinks.linkedin ? (
                  <a
                    href={formData.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="imp-link"
                  >
                    {formData.socialLinks.linkedin}
                  </a>
                ) : (
                  "Not added"
                )}
              </p>
            )}
          </div>

          <div className="imp-field">
            <label>GitHub</label>
            {isEditing ? (
              <input
                type="url"
                name="social_github"
                value={formData.socialLinks.github}
                onChange={handleInputChange}
                className="imp-input"
                placeholder="https://github.com/yourprofile"
              />
            ) : (
              <p className="imp-value">
                {formData.socialLinks.github ? (
                  <a
                    href={formData.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="imp-link"
                  >
                    {formData.socialLinks.github}
                  </a>
                ) : (
                  "Not added"
                )}
              </p>
            )}
          </div>

          <div className="imp-field">
            <label>Portfolio Website</label>
            {isEditing ? (
              <input
                type="url"
                name="social_portfolio"
                value={formData.socialLinks.portfolio}
                onChange={handleInputChange}
                className="imp-input"
                placeholder="https://yourportfolio.com"
              />
            ) : (
              <p className="imp-value">
                {formData.socialLinks.portfolio ? (
                  <a
                    href={formData.socialLinks.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="imp-link"
                  >
                    {formData.socialLinks.portfolio}
                  </a>
                ) : (
                  "Not added"
                )}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="imp-actions">
            <button className="imp-save-btn" onClick={handleSaveProfile}>
              Save Changes
            </button>
            <button className="imp-cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
