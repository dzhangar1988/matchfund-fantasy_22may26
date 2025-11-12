import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Users, Gift, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function TransactionHistory({ userId, limit = 10 }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const userTransactions = await base44.entities.Transaction.filter(
        { user_id: userId },
        "-created_date",
        limit
      );
      setTransactions(userTransactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type, amount) => {
    if (type === "join_fund") return TrendingDown;
    if (type === "win") return TrendingUp;
    if (type === "refund") return RefreshCw;
    if (type === "referral_bonus" || type === "referral_signup_bonus") return Gift;
    return DollarSign;
  };

  const getTransactionColor = (type, amount) => {
    if (amount > 0) return "text-green-400";
    if (amount < 0) return "text-red-400";
    return "text-gray-400";
  };

  const getTransactionLabel = (type) => {
    const labels = {
      join_fund: "Вступление в фонд",
      win: "Выигрыш",
      refund: "Возврат средств",
      referral_bonus: "Реферальный бонус",
      referral_signup_bonus: "Бонус за регистрацию"
    };
    return labels[type] || type;
  };

  return (
    <Card className="border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-orange-400" />
          История транзакций
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const Icon = getTransactionIcon(transaction.type, transaction.amount);
              const colorClass = getTransactionColor(transaction.type, transaction.amount);
              
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-gray-700 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {getTransactionLabel(transaction.type)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(transaction.created_date), "d MMM yyyy, HH:mm", { locale: ru })}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${colorClass}`}>
                    {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">Пока нет транзакций</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}