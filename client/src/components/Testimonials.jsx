export default function Testimonials() {
  return (
    <section className="py-24 bg-gray-50 px-6">

      {/* Heading */}
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-gray-800">
          What Our Users Say
        </h2>

        <p className="text-gray-500 mt-3">
          Thousands of teachers and students trust our platform
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">

        {/* Card 1 */}
        <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition border-t-4 border-blue-500">

          <div className="w-16 h-16 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full mx-auto mb-4 font-bold text-lg">
            ML
          </div>

          <p className="text-gray-600 italic text-center">
            “This LMS platform completely transformed how I manage my
            courses. It saves me hours every week.”
          </p>

          <div className="flex justify-center text-yellow-400 mt-4 text-lg">
            ★★★★☆
          </div>

          <h4 className="mt-4 text-center font-semibold text-gray-800">
            Dr. Michael Lee
          </h4>

          <p className="text-sm text-center text-gray-500">
            Professor of Computer Science
          </p>

        </div>

        {/* Card 2 */}
        <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition border-t-4 border-blue-500">

          <div className="w-16 h-16 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full mx-auto mb-4 font-bold text-lg">
            SJ
          </div>

          <p className="text-gray-600 italic text-center">
            “As a student, accessing lectures and assignments in one
            place makes studying much easier.”
          </p>

          <div className="flex justify-center text-yellow-400 mt-4 text-lg">
            ★★★★☆
          </div>

          <h4 className="mt-4 text-center font-semibold text-gray-800">
            Sarah Johnson
          </h4>

          <p className="text-sm text-center text-gray-500">
            Engineering Student
          </p>

        </div>

        {/* Card 3 */}
        <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition border-t-4 border-blue-500">

          <div className="w-16 h-16 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full mx-auto mb-4 font-bold text-lg">
            DB
          </div>

          <p className="text-gray-600 italic text-center">
            “The course management tools are incredibly easy to use.
            Highly recommended for educators.”
          </p>

          <div className="flex justify-center text-yellow-400 mt-4 text-lg">
            ★★★★★
          </div>

          <h4 className="mt-4 text-center font-semibold text-gray-800">
            David Brown
          </h4>

          <p className="text-sm text-center text-gray-500">
            Online Instructor
          </p>

        </div>

      </div>
    </section>
  );
}