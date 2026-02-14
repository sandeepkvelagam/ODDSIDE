import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  MessageSquare,
  ArrowRight,
  UserPlus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
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

const searchSequence = [
  {
    query: "sarah.k@gmail.com",
    resultName: "Sarah K.",
    resultAvatar: "S",
    resultColor: "bg-purple-500",
  },
  {
    query: "mike.t",
    resultName: "Mike T.",
    resultAvatar: "M",
    resultColor: "bg-blue-500",
  },
];

export default function GroupDemo() {
  const [phase, setPhase] = useState(0); // 0=search/invite, 1=group forming, 2=chat
  const [visibleMembers, setVisibleMembers] = useState([]);
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [linkMessage, setLinkMessage] = useState(false);
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

    const typeText = (text, onChar, onDone) => {
      const ids = [];
      text.split("").forEach((_, i) => {
        const t = setTimeout(() => {
          onChar(text.slice(0, i + 1));
        }, 40 * i);
        ids.push(t);
      });
      if (onDone) {
        const t = setTimeout(onDone, 40 * text.length + 200);
        ids.push(t);
      }
      return ids;
    };

    const runDemo = () => {
      clearTimeouts();
      timeoutsRef.current = [];
      setPhase(0);
      setVisibleMembers([]);
      setVisibleMessages([]);
      setSearchText("");
      setSearchResults([]);
      setLinkMessage(false);

      let offset = 0;

      // --- Phase 0: Search and invite flow (~4s) ---

      // Type first search query
      const typeIds1 = typeText(
        searchSequence[0].query,
        (partial) => setSearchText(partial),
        () => {
          // Show search result for first person
          setSearchResults((prev) => [
            ...prev,
            {
              name: searchSequence[0].resultName,
              avatar: searchSequence[0].resultAvatar,
              color: searchSequence[0].resultColor,
              invited: false,
            },
          ]);
        }
      );
      timeoutsRef.current.push(...typeIds1);

      const firstQueryDone = 40 * searchSequence[0].query.length + 200;

      // Auto-click invite on first result
      const inviteFirst = setTimeout(() => {
        setSearchResults((prev) =>
          prev.map((r, i) => (i === 0 ? { ...r, invited: true } : r))
        );
      }, firstQueryDone + 500);
      timeoutsRef.current.push(inviteFirst);

      const afterFirstInvite = firstQueryDone + 900;

      // Clear search, type second query
      const clearSearch = setTimeout(() => {
        setSearchText("");
      }, afterFirstInvite);
      timeoutsRef.current.push(clearSearch);

      const secondTypeStart = afterFirstInvite + 200;

      const typeIds2 = searchSequence[1].query.split("").map((_, i) => {
        const t = setTimeout(() => {
          setSearchText(searchSequence[1].query.slice(0, i + 1));
        }, secondTypeStart + 40 * i);
        return t;
      });
      timeoutsRef.current.push(...typeIds2);

      const secondQueryDone =
        secondTypeStart + 40 * searchSequence[1].query.length + 200;

      // Show search result for second person
      const showSecond = setTimeout(() => {
        setSearchResults((prev) => [
          ...prev,
          {
            name: searchSequence[1].resultName,
            avatar: searchSequence[1].resultAvatar,
            color: searchSequence[1].resultColor,
            invited: false,
          },
        ]);
      }, secondQueryDone);
      timeoutsRef.current.push(showSecond);

      // Auto-click invite on second result
      const inviteSecond = setTimeout(() => {
        setSearchResults((prev) =>
          prev.map((r, i) => (i === 1 ? { ...r, invited: true } : r))
        );
      }, secondQueryDone + 500);
      timeoutsRef.current.push(inviteSecond);

      const afterSecondInvite = secondQueryDone + 900;

      // Show "Invite link sent to 2 more" message
      const showLinkMsg = setTimeout(() => {
        setSearchText("");
        setLinkMessage(true);
      }, afterSecondInvite);
      timeoutsRef.current.push(showLinkMsg);

      const phase0End = afterSecondInvite + 1000;
      offset = phase0End;

      // --- Phase 1: Members join one by one ---
      const startPhase1 = setTimeout(() => {
        setPhase(1);
      }, offset);
      timeoutsRef.current.push(startPhase1);

      members.forEach((_, i) => {
        const t = setTimeout(() => {
          setVisibleMembers((prev) => [...prev, members[i]]);
        }, offset + 600 * (i + 1));
        timeoutsRef.current.push(t);
      });

      const phase1End = offset + 600 * members.length + 800;

      // --- Phase 2: Chat messages ---
      const startPhase2 = setTimeout(() => setPhase(2), phase1End);
      timeoutsRef.current.push(startPhase2);

      chatMessages.forEach((msg) => {
        const t = setTimeout(() => {
          setVisibleMessages((prev) => [...prev, msg]);
        }, phase1End + msg.delay);
        timeoutsRef.current.push(t);
      });

      // Reset cycle (~20 seconds total)
      const reset = setTimeout(runDemo, 20000);
      timeoutsRef.current.push(reset);
    };

    runDemo();
    return clearTimeouts;
  }, [isVisible]);

  return (
    <section
      ref={sectionRef}
      className="demo-section py-20 sm:py-28 bg-secondary/30"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Text */}
          <div className="order-2 md:order-1">
            <div className="scroll-animate-left">
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
          <div className="order-1 md:order-2 scroll-animate-scale transition-all duration-700 ease-out">
            <div className="bg-white rounded-2xl border border-gray-100/50 overflow-hidden shadow-[8px_8px_20px_rgba(0,0,0,0.06),-6px_-6px_16px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-1px_-1px_3px_rgba(0,0,0,0.03)]">
              {/* Group header */}
              <div className="p-4 border-b border-border/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">
                      Friday Night Poker
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {phase === 0
                        ? "Invite friends"
                        : `${visibleMembers.length} members`}
                    </p>
                  </div>
                  <AvatarGroup>
                    {visibleMembers.slice(0, 3).map((m, i) => (
                      <Avatar
                        key={i}
                        className="size-7 border-2 border-white animate-fade-in-up"
                      >
                        <AvatarFallback className={cn("text-[10px] font-bold text-white", m.color)}>
                          {m.avatar}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {visibleMembers.length > 3 && (
                      <AvatarGroupCount className="size-7 text-[10px] border-white">
                        +{visibleMembers.length - 3}
                      </AvatarGroupCount>
                    )}
                  </AvatarGroup>
                </div>

                {/* Search bar — visible during phase 0 */}
                {phase === 0 && (
                  <div className="mt-3 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <div className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary/50 text-xs text-foreground border border-border/20 h-7 flex items-center">
                      {searchText ? (
                        <span>{searchText}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          Search by name or email...
                        </span>
                      )}
                      {searchText && (
                        <span className="inline-block w-[1px] h-3.5 bg-foreground ml-[1px] animate-pulse" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Content area */}
              <div className="p-4 h-[240px] overflow-hidden">
                {/* Phase 0: Search / Invite */}
                {phase === 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 animate-fade-in-up"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                              result.color
                            )}
                          >
                            {result.avatar}
                          </div>
                          <span className="text-xs font-medium text-foreground">
                            {result.name}
                          </span>
                        </div>
                        {result.invited ? (
                          <span className="text-[11px] font-medium text-green-600">
                            Invited ✓
                          </span>
                        ) : (
                          <button className="text-[11px] font-medium text-white bg-[#EF6E59] hover:bg-[#EF6E59]/90 px-2.5 py-0.5 rounded-full">
                            Invite
                          </button>
                        )}
                      </div>
                    ))}
                    {linkMessage && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 animate-fade-in-up">
                        <UserPlus className="w-3.5 h-3.5 text-[#EF6E59]" />
                        Invite link sent to 2 more
                      </div>
                    )}
                  </div>
                )}

                {/* Phase 1: Members joining */}
                {phase === 1 && (
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

                {/* Phase 2: Chat */}
                {phase === 2 && (
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
