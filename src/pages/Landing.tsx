import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Code2, Users, Zap, MessageSquare, Play, Globe } from 'lucide-react';

const features = [
  { icon: Code2, title: 'Real-Time Code Editing', desc: 'Collaborate on code simultaneously with live sync powered by Supabase Realtime.' },
  { icon: Users, title: 'Presence Awareness', desc: 'See who is online with colored avatars and live cursor indicators.' },
  { icon: MessageSquare, title: 'Built-in Chat', desc: 'Communicate with your team without leaving the coding environment.' },
  { icon: Play, title: 'Code Execution', desc: 'Run your code instantly with support for JavaScript, Python, C++, and Java.' },
  { icon: Globe, title: 'Shareable Rooms', desc: 'Share a simple 6-character code to invite anyone to your session.' },
  { icon: Zap, title: 'Session History', desc: 'Review past sessions with code snapshots and participant info.' },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">DevSync</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Zap className="h-3.5 w-3.5" /> Real-Time Collaboration
          </div>
          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Code Together,{' '}
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Build Faster
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
            DevSync is a real-time collaborative coding platform. Create a room, share the code, and start building together — instantly.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="px-8 text-base">
                Start Coding <Code2 className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">Everything you need to collaborate</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30">
                <f.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8 text-center text-sm text-muted-foreground">
        <p>&copy; 2026 DevSync. Built with Supabase &amp; React.</p>
      </footer>
    </div>
  );
};

export default Landing;
