export default function Hero() {
  return (
    <section className="bg-blue-600 text-white py-28 px-6">
      <div className="max-w-5xl mx-auto text-center">

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Ready to Transform Your Learning Experience?
        </h1>

        {/* Description */}
        <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-10">
          Join thousands of teachers and students who are already using our
          platform to enhance their educational journey and create modern
          digital classrooms.
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-4 flex-wrap">
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold shadow-md hover:bg-gray-100 transition">
            Get Started Free →
          </button>

          <button className="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition">
            Learn More
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14 text-blue-100">
          <div className="bg-blue-500 p-4 rounded-lg">
            📚 Smart Learning Tools
          </div>

          <div className="bg-blue-500 p-4 rounded-lg">
            👩‍🏫 Teacher Friendly
          </div>

          <div className="bg-blue-500 p-4 rounded-lg">
            ⚡ Fast & Easy Setup
          </div>
        </div>

      </div>
    </section>
  );
}