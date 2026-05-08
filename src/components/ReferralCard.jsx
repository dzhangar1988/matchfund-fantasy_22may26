import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Users, DollarSign, Copy, Check, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReferralCard({ user, onUserUpdate }) {
  const [referralData, setReferralData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    setIsLoading(true);
    try {
      // Проверяем есть ли referral_code у пользователя
      if (!user.referral_code) {
        console.log("No referral code, generating...");
        await generateReferralCode();
        return;
      }

      // Загружаем данные о рефералах
      const allUsers = await base44.entities.User.list();
      const referrals = allUsers.filter(u => u.referred_by === user.id);
      
      // Подсчитываем заработанное
      const transactions = await base44.entities.Transaction.filter({ 
        user_id: user.id,
        type: "referral_bonus"
      });
      const totalEarned = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      setReferralData({
        referralCode: user.referral_code,
        friendsInvited: referrals.length,
        totalEarned: totalEarned
      });
    } catch (error) {
      console.error("Error loading referral data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReferralCode = async () => {
    setIsGeneratingCode(true);
    try {
      // Генерируем уникальный код (первые 8 символов user ID + случайные 4 символа)
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `${user.id.substring(0, 8).toUpperCase()}${randomPart}`;
      
      await base44.entities.User.update(user.id, { referral_code: code });
      
      if (onUserUpdate) await onUserUpdate();
      await loadReferralData();
    } catch (error) {
      console.error("Error generating referral code:", error);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyReferralLink = async () => {
    const referralLink = `${window.location.origin}?ref=${referralData.referralCode}`;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading || isGeneratingCode) {
    return (
      <Card className="border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!referralData) return null;

  return (
    <Card className="border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Gift className="w-6 h-6 text-orange-400" />
          Invite Friends & Earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Code */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Your referral code</label>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-3 bg-white/5 border border-gray-700 rounded-lg text-white font-mono text-lg">
              {referralData.referralCode}
            </div>
            <Button
              onClick={copyReferralLink}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-6"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Rewards */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-orange-400" />
            <span className="text-white font-semibold">Rewards:</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">• Your friend gets</span>
              <span className="text-green-400 font-bold">+ $50 bonus</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">• You get</span>
              <span className="text-orange-400 font-bold">~$25 per friend</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white/5 border border-gray-700 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <div className="text-3xl font-bold text-white">{referralData.friendsInvited}</div>
            <div className="text-sm text-gray-400">Friends invited</div>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-gray-700 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <div className="text-3xl font-bold text-white">${referralData.totalEarned}</div>
            <div className="text-sm text-gray-400">Total earned</div>
          </div>
        </div>

        {/* How it works */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-blue-400" />
            <span className="text-white font-semibold">How it works:</span>
          </div>
          <ol className="space-y-2 text-sm text-gray-300">
            <li>1. Share your referral link with friends</li>
            <li>2. They sign up using your link</li>
            <li>3. They get a $50 welcome bonus, you get $25</li>
            <li>4. Everyone wins! 🎉</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}