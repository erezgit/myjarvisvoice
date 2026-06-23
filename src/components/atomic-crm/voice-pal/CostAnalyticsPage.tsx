import { useState, useEffect } from "react";

// Known pricing rates
const RATES = {
  deepgram_stt: { unit: "minute", rate: 0.0059, label: "Deepgram STT (Nova-3)" },
  cartesia_tts: { unit: "1K chars", rate: 0.05, label: "Cartesia TTS (Sonic-3)" },
  anthropic_input: { unit: "1M tokens", rate: 3.0, label: "Claude Sonnet (input)" },
  anthropic_output: { unit: "1M tokens", rate: 15.0, label: "Claude Sonnet (output)" },
  openai_tts: { unit: "1M chars", rate: 15.0, label: "OpenAI TTS (feed voice)" },
};

type UsageStats = {
  voiceMessages: number;
  totalChars: number;
  estimatedMinutes: number;
  estimatedCost: {
    feedVoice: number;
    liveSTT: number;
    liveTTS: number;
    liveLLM: number;
    total: number;
  };
};

export function CostAnalyticsPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    fetch("http://localhost:3001/api/voice_messages")
      .then((r) => r.json())
      .then((msgs: any[]) => {
        const totalChars = msgs.reduce((sum, m) => sum + (m.message?.length || 0), 0);
        const feedVoiceCost = (totalChars / 1_000_000) * RATES.openai_tts.rate;

        // Estimate live voice usage (rough: assume 5 min avg per session, 3 sessions today)
        const estimatedMinutes = 15;
        const liveSTT = estimatedMinutes * RATES.deepgram_stt.rate;
        const liveTTS = (estimatedMinutes * 150 / 1000) * RATES.cartesia_tts.rate; // ~150 chars/min
        const liveLLM = (estimatedMinutes * 500 / 1_000_000) * RATES.anthropic_input.rate +
                        (estimatedMinutes * 200 / 1_000_000) * RATES.anthropic_output.rate;

        setStats({
          voiceMessages: msgs.length,
          totalChars,
          estimatedMinutes,
          estimatedCost: {
            feedVoice: feedVoiceCost,
            liveSTT: liveSTT,
            liveTTS: liveTTS,
            liveLLM: liveLLM,
            total: feedVoiceCost + liveSTT + liveTTS + liveLLM,
          },
        });
      })
      .catch(console.error);
  }, []);

  if (!stats) return <div className="p-10 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-2xl mx-auto px-10 py-8">
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-1">Cost Analytics</h1>
        <p className="text-sm text-muted-foreground mb-8">Estimated costs for voice services</p>

        {/* Summary Card */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <div className="text-3xl font-bold text-[#1a1a1a]">
            ${stats.estimatedCost.total.toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Estimated total today</p>
        </div>

        {/* Breakdown */}
        <h2 className="text-sm font-semibold text-[#1a1a1a] mb-4">Cost Breakdown</h2>
        <div className="space-y-3">
          <CostRow
            label="Voice Feed (OpenAI TTS)"
            detail={`${stats.voiceMessages} messages, ${(stats.totalChars / 1000).toFixed(1)}K chars`}
            cost={stats.estimatedCost.feedVoice}
          />
          <CostRow
            label="Live Voice — STT (Deepgram)"
            detail={`~${stats.estimatedMinutes} min of speech-to-text`}
            cost={stats.estimatedCost.liveSTT}
          />
          <CostRow
            label="Live Voice — TTS (Cartesia)"
            detail={`~${stats.estimatedMinutes} min of text-to-speech`}
            cost={stats.estimatedCost.liveTTS}
          />
          <CostRow
            label="Live Voice — LLM (Claude Sonnet)"
            detail="Input + output tokens"
            cost={stats.estimatedCost.liveLLM}
          />
        </div>

        {/* Rates Reference */}
        <h2 className="text-sm font-semibold text-[#1a1a1a] mt-8 mb-4">Rate Card</h2>
        <div className="bg-gray-50 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Service</th>
                <th className="text-right px-4 py-2 text-muted-foreground font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(RATES).map((r) => (
                <tr key={r.label} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 text-[#1a1a1a]">{r.label}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    ${r.rate.toFixed(4)} / {r.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-muted-foreground mt-6">
          Live voice costs are estimates. Actual usage tracked by Deepgram, Cartesia, and Anthropic dashboards.
          Feed voice costs are calculated from actual message character counts.
        </p>
      </div>
    </div>
  );
}

function CostRow({ label, detail, cost }: { label: string; detail: string; cost: number }) {
  return (
    <div className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
      <div>
        <p className="text-sm text-[#1a1a1a]">{label}</p>
        <p className="text-[10px] text-muted-foreground">{detail}</p>
      </div>
      <span className="text-sm font-medium text-[#1a1a1a]">${cost.toFixed(4)}</span>
    </div>
  );
}

CostAnalyticsPage.path = "/cost-analytics";
