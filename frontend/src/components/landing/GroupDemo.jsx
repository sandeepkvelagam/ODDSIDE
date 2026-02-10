import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Users, MessageSquare, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const members = [
  { name: "You", avatar: "Y", color: "bg-[#EF6E59]" },
  { name: "Mike T.", avatar: "M", color: "bg-blue-500" },
  { name: "Sarah K.", avatar: "S", color: "bg-purple-500" },
  { name: "James R.", avatar: "J", color: "bg-green-500" },
];

const chatMessages = [
  { sender: "You", text: "Game this Friday? 🃏", delay: 0 },
  { sender: "Mike T.", text: "I'm in! Same buy-in?", delay: 2000 },
  { sender: "Sarah K.", text: "Deal me in! 🔥", delay: 3500 },
  { sender: "James R.", text: "8pm works for me", delay: 5000 },
  { sender: "You", text: "Perfect. $20 buy-in. Let's go!", delay: 6500 },
];

export default function GroupDemo() {
  const [phase, setPhase] = useState(0); // 0=group forming, 1=chat
  const [visibleMembers, setVisibleMembers] = useState([]);
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) setIsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const clearTimeouts = () => timeoutsRef.current.forEach(clearTimeout);

    const runDemo = () => {
      clearTimeouts();
      timeoutsRef.current = [];
      setPhase(0);
      setVisibleMembers([]);
      setVisibleMessages([]);

      // Phase 0: members join one by one
      members.forEach((_, i) => {
        const t = setTimeout(() => {
          setVisibleMembers((prev) => [...prev, members[i]]);
        }, 600 * (i + 1));
        timeoutsRef.current.push(t);
      });

      // Phase 1: switch to chat after members populated
      const chatStart = setTimeout(() => setPhase(1), 3200);
      timeoutsRef.current.push(chatStart);

      // Chat messages appear
      chatMessages.forEach((msg, i) => {
        const t = setTimeout(() => {
          setVisibleMessages((prev) => [...prev, msg]);
        }, 3200 + msg.delay);
        timeoutsRef.current.push(t);
      });

      // Reset cycle
      const reset = setTimeout(runDemo, 16000);
      timeoutsRef.current.push(reset);
    };

    runDemo();
    return clearTimeouts;
  }, [isVisible]);

  return (
    <section ref={sectionRef} className="demo-section py-20 sm:py-28 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Text */}
          <div className="order-2 md:order-1">
            <div className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EF6E59]/10 text-[#EF6E59] text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                Group Management
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Plan your game night
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Create your poker group, invite friends with one tap, and plan
                game nights through built-in group chat. Everyone stays in the
                loop.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#EF6E59]" />
                  Invite friends by email or share a link
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#EF6E59]" />
                  Built-in group chat for coordination
                </li>
              </ul>
              <Link to="/login">
                <Button className="bg-[#262626] text-white hover:bg-[#363636] rounded-full px-6">
                  Create a Group
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Demo card */}
          <div className="order-1 md:order-2">
            <div className="bg-white rounded-2xl border border-border/30 shadow-card overflow-hidden">
              {/* Group header */}
              <div className="p-4 border-b border-border/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">
                      Friday Night Poker
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {visibleMembers.length} members
                    </p>
                  </div>
                  <div className="flex -space-x-2">
                    {visibleMembers.map((m, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white animate-fade-in-up",
                          m.color
                        )}
                      >
                        {m.avatar}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat area */}
              <div className="p-4 h-[240px] overflow-hidden">
                {phase === 0 && (
                  <div className="space-y-2">
                    {visibleMembers.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in-up"
                      >
                        <UserPlus className="w-3 h-3 text-[#EF6E59]" />
                        <span className="font-medium text-foreground">
                          {m.name}
                        </span>{" "}
                        joined the group
                      </div>
                    ))}
                  </div>
                )}
                {phase === 1 && (
                  <div className="space-y-3">
                    {visibleMessages.map((msg, i) => {
                      const member = members.find(
                        (m) => m.name === msg.sender
                      );
                      const isYou = msg.sender === "You";
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex gap-2 animate-fade-in-up",
                            isYou ? "justify-end" : ""
                          )}
                        >
                          {!isYou && (
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0",
                                member?.color
                              )}
                            >
                              {member?.avatar}
                            </div>
                          )}
                          <div
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs max-w-[180px]",
                              isYou
                                ? "bg-[#EF6E59] text-white rounded-br-sm"
                                : "bg-secondary text-foreground rounded-bl-sm"
                            )}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
