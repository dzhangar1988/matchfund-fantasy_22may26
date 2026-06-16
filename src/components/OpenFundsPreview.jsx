import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FundCard from "./FundCard";
import { useLanguage } from "@/lib/LanguageContext";

export default function OpenFundsPreview({ funds, totalCount, allFundsCount }) {
  const { t } = useLanguage();
  const displayFunds = funds;
  console.log("DISPLAY FUNDS:", displayFunds.length, displayFunds.map(f => ({title: f.title, status: f.status, vis: f.visibility})));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-orange-400" />
          {t("open_funds")} {totalCount > 0 && `(${totalCount})`}
        </h2>
      </div>

      {displayFunds.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {displayFunds.map((fund) => (
              <FundCard key={fund.id} fund={fund} />
            ))}
          </div>


        </>
      ) : (
        <Card className="border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
          <CardContent className="p-12 text-center">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <>
              <h3 className="text-xl font-semibold text-white mb-2">{t("no_funds")}</h3>
              <p className="text-gray-400 mb-6">{t("be_first_to_create")}</p>
            </>
            <Link to={createPageUrl("CreateFund")}>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                {t("create_fund")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}