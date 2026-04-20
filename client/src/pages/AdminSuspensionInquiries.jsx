import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function AdminSuspensionInquiries() {
  const auth = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");

  const fetch = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/suspension-inquiries/admin", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setInquiries(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.token) fetch();
  }, [auth]);

  const handleReply = async (inquiryId) => {
    try {
      await axios.post(`http://localhost:5000/api/suspension-inquiries/${inquiryId}/reply`, { adminReply: reply }, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setReply("");
      setSelected(null);
      fetch();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to send reply");
    }
  };

  if (loading) return <div className="p-8 text-gray-500 animate-pulse">Loading inquiries...</div>;

  return (
    <div className="p-8 min-h-screen bg-linear-to-br from-gray-100 to-gray-200">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 tracking-tight">
        Suspension Inquiries
      </h2>

      {inquiries.length === 0 ? (
        <div className="text-gray-500 italic">No inquiries found</div>
      ) : (
        <div className="space-y-5">
          {inquiries.map((iq) => (
            <div
              key={iq._id}
              className="border border-gray-200 rounded-xl p-5 bg-white shadow-md hover:shadow-xl transition duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  
                  {/* Name + Role */}
                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-lg text-gray-800">
                      {iq.userId?.name || "Unknown User"}
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold shadow-sm ${
                        iq.userRole === "Student"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {iq.userRole === "Student" ? "Student" : "Instructor"}
                    </span>
                  </div>

                  <div className="text-black mt-2" style={{fontSize:"16px"}}>
                    📧 {iq.userId?.email || "N/A"}
                  </div>
                  <div className="text-black" style={{fontSize:"16px"}}>
                    🕒 {new Date(iq.createdAt).toLocaleString()}
                  </div>

                  {/* Message */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <strong className="text-sm text-gray-700">Message</strong>
                    <p className="leading-relaxed text-black" style={{fontSize:"16px"}}>
                      {iq.message || <em className="text-black" style={{fontSize:"16px"}}>(no message)</em>}
                    </p>
                  </div>

                  {/* Admin Reply */}
                  {iq.adminReply && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <strong className="text-sm text-green-800">Admin Reply</strong>
                      <p className="text-sm text-green-700 mt-2 leading-relaxed">
                        {iq.adminReply}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="text-right ml-4">
                  <div
                    className={`text-xs px-3 py-1 rounded-full font-semibold shadow ${
                      iq.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {iq.status === "pending" ? "Pending" : "Replied"}
                  </div>
                </div>
              </div>

              {/* Reply Button */}
              {iq.status !== "replied" && (
                <div className="mt-5">
                  <button
                    onClick={() => setSelected(iq)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow hover:bg-blue-700 hover:scale-[1.03] transition"
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg animate-fadeIn">
            
            <h3 className="font-semibold text-lg mb-3 text-gray-800">
              Reply to {selected.userId?.name || "Unknown User"}{" "}
              <span
                className={`ml-2 text-xs px-2 py-1 rounded-full ${
                  selected.userRole === "Student"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {selected.userRole === "Student" ? "Student" : "Instructor"}
              </span>
            </h3>

            <div className="mb-2 text-sm text-gray-600">
              📧 {selected.userId?.email || "N/A"}
            </div>

            <div className="mb-4 text-sm text-black bg-gray-50 p-3 rounded border">
              <strong>Original message:</strong>
              <p className="mt-1 text-black">
                {selected.message || <em>(no message)</em>}
              </p>
            </div>

            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="w-full border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-400 p-3 rounded-lg mb-4 outline-none"
              rows={5}
              placeholder="Write your reply..."
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelected(null);
                  setReply("");
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReply(selected._id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 hover:scale-[1.03] transition"
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}