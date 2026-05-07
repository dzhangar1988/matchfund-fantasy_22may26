import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

export default function InfoCard() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const collapsed = localStorage.getItem("infoCardCollapsed");
    if (collapsed === "true") setIsCollapsed(true);
  }, []);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("infoCardCollapsed", newState.toString());
  };

  return (
    <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 mb-3">
            <Lightbulb className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold text-lg">How predictions work</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>

        {!isCollapsed && (
          <div className="space-y-3 text-sm text-gray-300">
            <p className="text-gray-400 mb-3">
              <strong className="text-white">Max 2 predictions per match.</strong> Each prediction costs 1 credit:
            </p>

            <div className="flex items-start gap-2">
              <span className="text-orange-400 font-bold">•</span>
              <div>
                <strong className="text-white">Match outcome</strong>:
                <span className="text-orange-400 font-bold ml-1">3 pts</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">•</span>
              <div>
                <strong className="text-white">Both teams to score</strong>:
                <span className="text-blue-400 font-bold ml-1">2 pts</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">•</span>
              <div>
                <strong className="text-white">Goals total</strong> (3+ / 0-2):
                <span className="text-purple-400 font-bold ml-1">2.5 pts</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-orange-400 font-bold">•</span>
              <div>
                <strong className="text-white">Blowout</strong> (win by 3+ goals):
                <span className="text-orange-400 font-bold ml-1">2.5 pts</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-green-400 font-bold">•</span>
              <div>
                <strong className="text-white">Win to nil</strong>:
                <span className="text-green-400 font-bold ml-1">4 pts</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-yellow-400 font-bold">•</span>
              <div>
                <strong className="text-white">Exact score</strong>:
                <span className="text-yellow-400 font-bold ml-1">9 pts</span>
              </div>
            </div>

            <div className="mt-3 p-2 rounded bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-300">
                💡 <strong>Tip:</strong> Use your predictions wisely — unused credits are lost!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}