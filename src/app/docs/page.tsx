import Image from "next/image";
import chat from "@screenshots/chat.png"
export default function Docs() {
  return (
    <main className="relative max-w-5xl mx-auto px-6 py-16 space-y-16 overflow-hidden">
      
      {/* Glow background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-1/2 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      {/* Header */}
      <section className="space-y-4">
        <h1 className="text-4xl font-bold">ChatterBox Documentation</h1>
        <p className="text-lg text-muted-foreground">
          ChatterBox is a full-stack real-time chat application designed to
          deliver fast, secure, and scalable communication using modern web
          technologies.
        </p>
      </section>

      {/* Overview */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p>
          ChatterBox enables users to register, authenticate, and communicate in
          real time through a clean and responsive interface. The application
          focuses on reliability, performance, and a production-grade
          authentication flow.
        </p>
      </section>

      {/* Screenshots */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Application Screenshots</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-2">
            <p className="font-medium">Landing Page</p>
            <Image
              src="/screenshots/landing1.png"
              alt="ChatterBox Landing Page"
              width={800}
              height={500}
              className="rounded-xl border shadow-lg"
            />
          </div>

          <div className="space-y-2">
            <p className="font-medium">Chat Interface</p>
            <Image
              src="/screenshots/chat1.png"
              alt="Chat Interface"
              width={800}
              height={500}
              className="rounded-xl border shadow-lg"
            />
          </div>

          <div className="space-y-2">
            <p className="font-medium">Signup Page</p>
            <Image
              src="/screenshots/signup1.png"
              alt="Signup Page"
              width={800}
              height={500}
              className="rounded-xl border shadow-lg"
            />
          </div>

          <div className="space-y-2">
            <p className="font-medium">Login Page</p>
            <Image
              src="/screenshots/login1.png"
              alt="Login Page"
              width={800}
              height={500}
              className="rounded-xl border shadow-lg"
            />
          </div>

          

        </div>
      </section>

      {/* Features */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Key Features</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Real-time one-to-one and room-based messaging</li>
          <li>Secure user authentication and session management</li>
          <li>Persistent message storage using SQL databases</li>
          <li>Scalable backend architecture</li>
          <li>Modern, responsive UI built with React and Next.js</li>
        </ul>
      </section>

      {/* Tech Stack */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Tech Stack</h2>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Frontend:</strong> Next.js, React, Tailwind CSS</li>
          <li><strong>Backend:</strong> Express.js, REST APIs</li>
          <li><strong>Database:</strong> PostgreSQL</li>
          <li><strong>Authentication:</strong> JWT, secure cookies</li>
          <li><strong>Realtime:</strong> WebSockets</li>
        </ul>
      </section>

      {/* Goals */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Project Goals</h2>
        <p>
          The primary goal of ChatterBox is to demonstrate a real-world,
          production-style chat system suitable for technical interviews,
          internships, and scalable deployments. The project emphasizes clean
          architecture, security best practices, and maintainable code.
        </p>
      </section>

    </main>
  );
}
