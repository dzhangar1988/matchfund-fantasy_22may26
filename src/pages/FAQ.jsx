import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Trophy, TrendingUp, Users, Shield, Lock, HelpCircle } from "lucide-react";

export default function FAQ() {
  const faqs = [
    {
      icon: Target,
      question: "Как работает система кредитов?",
      answer: (
        <>
          <p className="mb-3">Каждый фонд даёт вам <strong>10-20 кредитов</strong> на <strong>10 матчей</strong>. Максимум <strong>2 прогноза на матч</strong>.</p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li><strong>Исход матча (3 очка, 1 кредит):</strong> П1/Х/П2.</li>
            <li><strong>Обе забьют (2 очка, 1 кредит):</strong> Да или Нет.</li>
            <li><strong>Больше/Меньше 2.5 голов (2.5 очка, 1 кредит):</strong> Тотал голов в матче.</li>
            <li><strong>Фора (2.5 очка, 1 кредит):</strong> П1 с разницей 2+ или П2 не более -1.</li>
            <li><strong>Сухая победа (4.5 очка, 1.5 кредита):</strong> П1 или П2 выиграют, не пропустив.</li>
            <li><strong>Точный счёт (9 очков, 3 кредита):</strong> Угадайте точный итоговый счёт.</li>
          </ul>
          <p className="font-semibold text-orange-400">Минимум: 10 кредитов • Максимум: 20 кредитов • Макс 2 прогноза на матч</p>
        </>
      )
    },
    {
      icon: Trophy,
      question: "Что делать с неиспользованными кредитами?",
      answer: (
        <>
          <p className="mb-3">Вы можете сохранить до <strong>10 неиспользованных кредитов</strong> (20 всего - минимум 10).</p>
          <p className="mb-3">Каждый неиспользованный кредит даёт <strong>0.5 бонусных очка</strong>.</p>
          <p className="text-sm text-gray-400">
            Пример: Используете только 15 кредитов = 5 неиспользованных = +2.5 бонусных очка
          </p>
        </>
      )
    },
    {
      icon: Shield,
      question: "Можно ли делать несколько прогнозов на один матч?",
      answer: (
        <>
          <p className="mb-3"><strong>Да!</strong> Но максимум <strong>2 прогноза на матч</strong>.</p>
          <p className="mb-3">Например: Bold прогноз (3 очка, 1 кр) + Обе забьют (2 очка, 1 кр) = 2 кредита на матч.</p>
          <p className="text-sm text-gray-400">
            💡 Стратегия: комбинируйте разные типы прогнозов для максимизации очков!
          </p>
        </>
      )
    },
    {
      icon: TrendingUp,
      question: "Как распределяется призовой фонд?",
      answer: (
        <>
          <p className="mb-3">Призовой фонд распределяется между победителями пропорционально их результатам:</p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li><strong>7% комиссия платформы</strong> (на развитие сервиса)</li>
            <li><strong>1% бонус создателю фонда</strong> (за организацию)</li>
            <li><strong>92% призовой фонд</strong> делится между игроками с наибольшим количеством очков</li>
          </ul>
          <p className="text-sm text-gray-400">
            Пример: Фонд на 10 человек × $100 = $1000 → $920 призовой фонд
          </p>
        </>
      )
    },
    {
      icon: Users,
      question: "Что происходит если не набралось минимум участников?",
      answer: (
        <>
          <p className="mb-3">Если к началу первого матча в фонде меньше участников чем указано в <strong>min_participants</strong>:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Фонд автоматически отменяется</li>
            <li>Всем участникам возвращается полный взнос (100%)</li>
            <li>Никто не теряет деньги</li>
          </ul>
        </>
      )
    },
    {
      icon: Lock,
      question: "Когда закрываются прогнозы?",
      answer: (
        <>
          <p className="mb-3">Прогнозы закрываются автоматически:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>За 5 минут до начала первого матча</strong> в фонде</li>
            <li>После этого новые игроки не могут присоединиться</li>
            <li>Существующие участники не могут изменить свои прогнозы</li>
          </ul>
          <p className="text-sm text-yellow-400 mt-3">
            ⚠️ Успейте сделать прогнозы заранее!
          </p>
        </>
      )
    }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Часто задаваемые вопросы</h1>
          <p className="text-gray-400">Всё что нужно знать о MatchFund Fantasy</p>
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
                Остались вопросы?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                Свяжитесь с нами через кнопку обратной связи на боковой панели
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}