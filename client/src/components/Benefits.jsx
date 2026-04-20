export default function Benefits() {
  return (
    <section className="py-10 bg-gray-50 px-6">
      <h2 className="text-4xl font-bold text-center text-gray-800 mb-4">
        Benefits for Everyone
      </h2>

      <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
        Whether you're a teacher or a student, our platform enhances the
        learning experience.
      </p>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">

        {/* Teachers */}
        <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-6 text-blue-600 text-center">
            For Teachers
          </h3>

          <ul className="space-y-4">
            {[
              "Create and manage courses with ease",
              "Share materials in various formats",
              "Design assessments and quizzes",
              "Track student progress",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-lg">✔</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Students */}
        <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-6 text-blue-600 text-center">
            For Students
          </h3>

          <ul className="space-y-4">
            {[
              "Access all course materials",
              "Submit assignments digitally",
              "Take quizzes with instant feedback",
              "Track grades and progress",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-700">
                <span className="text-green-500 text-lg">✔</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </section>
  );
}