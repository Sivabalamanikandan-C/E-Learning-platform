import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function AdminPayments() {
  const auth = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/payments", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setPayments(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError(err.response?.data?.message || "Failed to fetch payments");
        setLoading(false);
      }
    };

    if (auth?.token) {
      fetchPayments();
    }
  }, [auth]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="admin-payments p-8">
      <h2 className="text-3xl font-bold mb-8">Manage Payments</h2>

      {payments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No payments found</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="w-full border-collapse">
            <thead className="bg-yellow-600 text-white">
              <tr>
                <th className="p-4 text-left">Student</th>
                <th className="p-4 text-left">Course</th>
                <th className="p-4 text-left">Amount</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Payment Method</th>
                <th className="p-4 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{payment.studentId?.name || "N/A"}</td>
                  <td className="p-4">{payment.courseId?.title || "N/A"}</td>
                  <td className="p-4">₹{payment.amount}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded text-white text-sm ${
                        payment.status === "completed"
                          ? "bg-green-600"
                          : payment.status === "pending"
                          ? "bg-yellow-600"
                          : "bg-red-600"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="p-4">{payment.paymentMethod}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
