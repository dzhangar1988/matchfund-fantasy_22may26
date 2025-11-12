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
          <p className="mb-3">Каждый фонд даёт вам <strong>12 кредитов</strong> на <strong>10 матчей</strong>. <strong>1 кредит = 1 прогноз.</strong></p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li><strong>Bold прогноз (3 очка):</strong> Выберите победителя или ничью.</li>
            <li><strong>Точный счёт (9 очков):</strong> Угадайте точный итоговый счёт.</li>
            <li><strong>Больше голов (2 очка):</strong> Больше 1.5 или 2.5 голов в матче.</li>
            <li><strong>Обе забьют (2 очка):</strong> Обе команды забьют хотя бы 1 гол.</li>
            <li><strong>Hedge стратегия (1.5 очка):</strong> Используйте 2 прогноза на исход (например: Победа 1 + Ничья). Если не угадали основной — получите 1.5 очка.</li>
            <li><strong>Полное покрытие (3 очка):</strong> Выберите все 3 исхода (Победа 1 + Ничья + Победа 2) = гарантированно 3 очка.</li>
          </ul>
          <p className="font-semibold text-orange-400">Минимум: 10 кредитов (1 на матч) • Максимум: 12 кредитов</p>
        </>
      )
    },
    {
      icon: Trophy,
      question: "Что делать с неиспользованными кредитами?",
      answer: (
        <>
          <p className="mb-3">Вы можете сохранить до <strong>2 неиспользованных кредитов</strong> (12 всего - минимум 10).</p>
          <p className="mb-3">Каждый неиспользованный кредит даёт <strong>0.5 бонусных очка</strong>.</p>
          <p className="text-sm text-gray-400">
            Пример: Используете только 10 кредитов = 2 неиспользованных = +1 бонусное очко
          </p>
        </>
      )
    },
    {
      icon: Shield,
      question: "Можно ли выбрать все 3 исхода на один матч?",
      answer: (
        <>
          <p className="mb-3"><strong>Да!</strong> Это называется <strong>"Полное покрытие"</strong>.</p>
          <p className="mb-3">Если выберете Победа 1 + Ничья + Победа 2 (3 кредита), вы гарантированно получите <strong>3 очка</strong>, так как один исход точно совпадёт.</p>
          <p className="text-sm text-gray-400">
            💡 Это полезная стратегия для непредсказуемых матчей, когда вы хотите гарантировать минимум очков.
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