import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Trophy, TrendingUp, Users, Shield, Lock, HelpCircle } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function FAQ() {
  const { t } = useLanguage();

  const faqs = [
    {
      icon: Target,
      question: t("faq_q1"),
      answer: (
        <>
          <p className="mb-3">{t("faq_q1_p1")}</p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li><strong>{t("faq_q1_l1")}</strong></li>
            <li><strong>{t("faq_q1_l2")}</strong></li>
            <li><strong>{t("faq_q1_l3")}</strong></li>
            <li><strong>{t("faq_q1_l4")}</strong></li>
            <li><strong>{t("faq_q1_l5")}</strong></li>
            <li><strong>{t("faq_q1_l6")}</strong></li>
          </ul>
          <p className="font-semibold text-orange-400">{t("faq_q1_note")}</p>
        </>
      )
    },
    {
      icon: Trophy,
      question: t("faq_q2"),
      answer: (
        <>
          <p className="mb-3">{t("faq_q2_p1")}</p>
          <p className="mb-3">{t("faq_q2_p2")}</p>
          <p className="text-sm text-gray-400">{t("faq_q2_example")}</p>
        </>
      )
    },
    {
      icon: Shield,
      question: t("faq_q3"),
      answer: (
        <>
          <p className="mb-3">{t("faq_q3_p1")}</p>
          <p className="mb-3">{t("faq_q3_p2")}</p>
          <p className="text-sm text-gray-400">{t("faq_q3_tip")}</p>
        </>
      )
    },
    {
      icon: TrendingUp,
      question: t("faq_q4"),
      answer: (
        <>
          <p className="mb-3">{t("faq_q4_p1")}</p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li><strong>{t("faq_q4_l1")}</strong></li>
            <li><strong>{t("faq_q4_l2")}</strong></li>
            <li><strong>{t("faq_q4_l3")}</strong></li>
          </ul>
          <p className="font-semibold text-orange-400 mt-4 mb-2">{t("faq_q4_h2")}</p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li><strong>{t("faq_q4_d1")}</strong></li>
            <li><strong>{t("faq_q4_d2")}</strong></li>
            <li><strong>{t("faq_q4_d3")}</strong></li>
          </ul>
          <p className="text-sm text-gray-400">{t("faq_q4_example")}</p>
        </>
      )
    },
    {
      icon: Users,
      question: t("faq_q5"),
      answer: (
        <>
          <p className="mb-3">{t("faq_q5_p1")}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("faq_q5_l1")}</li>
            <li>{t("faq_q5_l2")}</li>
            <li>{t("faq_q5_l3")}</li>
          </ul>
        </>
      )
    },
    {
      icon: Lock,
      question: t("faq_q6"),
      answer: (
        <>
          <p className="mb-3">{t("faq_q6_p1")}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>{t("faq_q6_l1")}</strong></li>
            <li>{t("faq_q6_l2")}</li>
            <li>{t("faq_q6_l3")}</li>
          </ul>
          <p className="text-sm text-yellow-400 mt-3">{t("faq_q6_warning")}</p>
        </>
      )
    }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t("faq_heading")}</h1>
          <p className="text-gray-400">{t("faq_desc")}</p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <Card key={index} className="border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                    <faq.icon className="w-5 h-5 text-white" />
                  </div>
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-300">{faq.answer}</div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                {t("faq_still_questions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">{t("faq_contact")}</p>
              <a
                href="mailto:d.sangadzhiev1988@gmail.com"
                className="inline-block text-green-400 hover:text-green-300 font-semibold underline"
              >
                d.sangadzhiev1988@gmail.com
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}