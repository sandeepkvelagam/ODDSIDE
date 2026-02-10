const pills = [
  "Group Management",
  "Live Tracking",
  "Instant Settlement",
  "Game History",
  "30s Logging",
  "Immutable Ledger",
];

export default function FeaturePills() {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-8">
      {pills.map((pill) => (
        <span
          key={pill}
          className="px-3 py-1.5 rounded-full border border-white/15 text-gray-400 text-xs font-medium bg-white/5"
        >
          {pill}
        </span>
      ))}
    </div>
  );
}
