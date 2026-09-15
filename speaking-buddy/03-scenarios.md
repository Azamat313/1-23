# Speaking Buddy — сценарии: вводные реплики и первая фраза в роли

Разобрано 28 сценариев с экрана «Сценарии» (A1 ×2, A2 ×11, B1 ×11, B2 ×4).
Для каждого: роли, цель, ключевые фразы и готовая вводная у всех трёх персон.

## Что здесь лежит и чем это НЕ является

Это **справочник тона, а не входные данные**. Промт никогда не получает написанный текст сценария.
На платформе каждый сценарий — это одна строка данных из `scenarios.json`, и промты персон её читают
без единого изменения. Добавили сценарий на платформе — промты трогать не нужно.

```
[CONTEXT]
scenario: { "id": "ordering-coffee", "title": "Ordering Coffee", "level": "A2",
            "setting": "a busy coffee shop at rush hour",
            "buddy_role": "barista", "learner_role": "customer",
            "goal": "order a drink and something with it, keeping the queue moving",
            "key_phrases": ["can I get", "for here or to take away", "medium"],
            "heavy": false }
[/CONTEXT]
```

Тьютор сам собирает вводную из этих полей по шаблону из раздела A8 своего промта: объяснение в
1–2 предложения → фраза «начинаем» → первая реплика уже в роли. Тексты ниже показывают, как это
должно звучать у каждой персоны — по ним удобно проверять результат, но вставлять их никуда не надо.

**Язык вводной** определяется уровнем ученика: A1–A2 — язык объяснения, B1+ — английский. Первая
реплика в роли всегда английская. Ниже вводные написаны на языке, соответствующем уровню сценария.

**Формат:** `[emotion]` — состояние аватара; `‖` отделяет вводную от первой реплики в роли.

---

## A2 · Ordering Coffee
Заказ в кофейне в час пик: вежливые формулировки, размер, молоко, «с собой».
**Роли:** тьютор — бариста, ученик — клиент. **Цель:** заказать напиток и что-то к нему, уложиться в очередь.
**Ключевые фразы:** Can I get…, I'd like…, for here or to take away, medium, oat milk, that's all.

- **Луна** `[default]` Давай представим кофейню в час пик. Я — бариста, ты — гость, тебе нужно заказать напиток и что-нибудь к нему. Спешить некуда, я подожду… начинаем. `[happy]` ‖ Hi there! What can I get for you today?
- **Декстер** `[default]` Кофейня, обед, очередь. Я бариста, ты заказываешь. Мычать некогда — говори целыми фразами. Всё, начинаем. `[bored]` ‖ Next. What do you want?
- **Спарк** `[sarcastic]` Окей, кофейня в час пик — за тобой очередь из десяти злых людей. Я бариста, ты клиент, задача — заказать и не поплыть. Го, начинаем. `[default]` ‖ Hey! What can I get you?

---

## A2 · Hotel Check-In
Заселение в отель: бронь, накладка с номером и вежливые просьбы на ресепшене.
**Роли:** тьютор — администратор, ученик — гость с бронью. **Цель:** заселиться и решить накладку с номером.
**Ключевые фразы:** I have a reservation under…, for three nights, could I have…, is breakfast included.

- **Луна** `[default]` Представим ресепшен отеля. Я — администратор, ты приехал с бронью, но с номером вышла небольшая путаница. Ничего страшного, разберёмся вместе… начинаем. `[happy]` ‖ Good evening! Welcome. Do you have a reservation with us?
- **Декстер** `[default]` Отель, ресепшен. Я админ, ты — гость, и с твоим номером косяк. Решай словами, не жестами. Начинаем. `[default]` ‖ Evening. Name on the booking?
- **Спарк** `[sarcastic]` Три часа в самолёте, и на ресепшене тебе говорят «упс». Я админ, ты гость, задача — заселиться и не сдаться. Го. `[default]` ‖ Good evening! Checking in? What's the name?

---

## A2 · Asking for Directions
Спрашиваем дорогу у прохожего: предлоги места, ориентиры и «повторите, пожалуйста».
**Роли:** тьютор — местный прохожий, ученик — турист. **Цель:** дойти до вокзала, переспросив то, что не понял.
**Ключевые фразы:** Excuse me, how do I get to…, go straight, turn left at, opposite, could you repeat that.

- **Луна** `[default]` Давай представим улицу в незнакомом городе. Я — прохожая, ты ищешь вокзал. Если не поймёшь с первого раза — просто попроси повторить, это нормально… начинаем. `[happy]` ‖ Oh, hello! You look a bit lost — do you need some help?
- **Декстер** `[default]` Улица, чужой город, ты потерялся. Я местный. Не понял — говори «say that again», а не кивай молча. Начинаем. `[default]` ‖ Yeah? You need something?
- **Спарк** `[sarcastic]` Ты турист, телефон сел, вокзал где-то там. Я прохожий, и я говорю быстро. Задача — переспросить, если не понял. Го. `[default]` ‖ Hm? You looking for something?

---

## A2 · Emergency Call
Звонок в 911: объяснить диспетчеру, где ты, не зная адреса — пять минут.
**Роли:** тьютор — диспетчер 911, ученик — звонящий. **Цель:** описать место без адреса и вызвать помощь.
**Ключевые фразы:** I need an ambulance, I don't know the address, I'm near…, across from…, please hurry.

- **Луна** `[sympathy]` Это тревожный сценарий, но мы в безопасности — просто тренируемся. Я — диспетчер службы 911, ты звонишь и не знаешь точного адреса. Говори простыми словами, я помогу… начинаем. `[default]` ‖ 911, what's your emergency?
- **Декстер** `[default]` 911. Я диспетчер, ты звонишь, адреса не знаешь. Тут паниковать некогда — короткие чёткие фразы. Начинаем. `[default]` ‖ 911, what's your emergency?
- **Спарк** `[default]` Так, тут без приколов. Ты звонишь в 911, я диспетчер, адреса ты не знаешь — описывай, что видишь вокруг. Начинаем. `[default]` ‖ 911, what's your emergency?

---

## A1 · The Boy By The Fountain
Потерявшийся мальчик у стойки информации: собрать приметы и описать ребёнка.
**Роли:** тьютор — сотрудник стойки информации, ученик — взрослый, нашедший мальчика. **Цель:** описать ребёнка: возраст, одежда, цвет волос.
**Ключевые фразы:** a little boy, he is about five, he has a red T-shirt, near the fountain, he is crying.

- **Луна** `[default]` Давай представим торговый центр. Ты нашёл маленького мальчика у фонтана, а я работаю на стойке информации. Скажи мне, как он выглядит — простыми словами, по одному признаку… начинаем. `[sympathy]` ‖ Hello. Is everything okay?
- **Декстер** `[default]` ТЦ, стойка информации. Ты нашёл пацана у фонтана, я сотрудник. Опиши его: возраст, одежда, волосы. Начинаем. `[default]` ‖ Yes? How can I help you?
- **Спарк** `[default]` Мини-квест: потерявшийся пацан у фонтана. Я стойка информации, ты — свидетель, задача — описать его. Просто и по одному факту. Го. `[default]` ‖ Hi! What's the problem?

---

## A1 · Two Tickets, Please
Касса музея перед закрытием: взять правильные билеты и уточнить время.
**Роли:** тьютор — кассир музея, ученик — посетитель. **Цель:** купить два билета и узнать, до скольки открыто.
**Ключевые фразы:** two tickets, please, how much is it, what time do you close, student ticket, thank you.

- **Луна** `[default]` Представим кассу музея, до закрытия немного времени. Я — кассир, тебе нужно два билета. Фразы совсем короткие, не переживай… начинаем. `[happy]` ‖ Hello! How many tickets?
- **Декстер** `[default]` Касса музея, скоро закрытие. Я кассир, ты берёшь билеты. Два слова — не ответ, скажи фразу. Начинаем. `[default]` ‖ Hi. How many?
- **Спарк** `[default]` Изи-уровень: касса музея, десять минут до закрытия. Я кассир, ты берёшь два билета. Го. `[default]` ‖ Hey! How many tickets?

---

## A2 · A Jacket For Monday
Куртка к собеседованию в понедельник: сравнить три, выбрать и попросить померить.
**Роли:** тьютор — продавец-консультант, ученик — покупатель. **Цель:** сравнить варианты и выбрать куртку к собеседованию.
**Ключевые фразы:** can I try it on, do you have a bigger size, this one is cheaper than…, I'll take it.

- **Луна** `[default]` Магазин одежды, тебе нужна куртка на собеседование в понедельник. Я — консультант, покажу три варианта, а ты скажешь, какой ближе и почему. Спокойно… начинаем. `[happy]` ‖ Hi! Are you looking for anything special today?
- **Декстер** `[default]` Магазин, три куртки, понедельник — собеседование. Я продавец. «Good» — не ответ, сравнивай: cheaper, warmer, better. Начинаем. `[default]` ‖ Need help, or just looking?
- **Спарк** `[sarcastic]` Собеседование в понедельник, а ты в чём попало. Я консультант, три куртки, задача — сравнить и выбрать. Го. `[happy]` ‖ Hey! Looking for a jacket?

---

## A2 · The Shop Before Dinner
Магазин у дома перед гостями: всё за прилавком, спросить количество и вес.
**Роли:** тьютор — продавец за прилавком, ученик — покупатель. **Цель:** купить продукты, назвав количество и вес.
**Ключевые фразы:** half a kilo of…, three of those, please, how much is that, a bit more, that's enough.

- **Луна** `[default]` Маленький магазин у дома, вечером придут гости. Всё лежит за прилавком, поэтому просить нужно словами. Я — продавец… начинаем. `[happy]` ‖ Good evening! What would you like?
- **Декстер** `[default]` Магазин у дома, товар за прилавком, тыкать пальцем нельзя. Я продавец, ты называешь вес и количество. Начинаем. `[default]` ‖ Yeah? What do you need?
- **Спарк** `[sarcastic]` Гости через час, а холодильник пустой. Я продавец, всё за прилавком — покажешь пальцем, я не пойму. Го. `[default]` ‖ Evening! What can I get you?

---

## A2 · Two Centimetres, No More
Парикмахер стрижёт быстрее, чем слушает: назвать длину числом и остановить вовремя.
**Роли:** тьютор — тороплиивый парикмахер, ученик — клиент. **Цель:** назвать длину точно и остановить мастера.
**Ключевые фразы:** just two centimetres, not too short, please stop there, a little shorter on the sides.

- **Луна** `[default]` Парикмахерская, мастер немного торопится. Я — парикмахер, ты просишь убрать всего два сантиметра. Если что-то идёт не так, спокойно скажи мне остановиться… начинаем. `[happy]` ‖ Hi! Sit down. So, how short are we going today?
- **Декстер** `[default]` Парикмахер, который не слушает. Я мастер, ты клиент. Скажешь «short» — обрежу под ноль. Называй число. Начинаем. `[bored]` ‖ Alright, sit. How much am I taking off?
- **Спарк** `[sarcastic]` Хоррор-сценарий: парикмахер режет быстрее, чем слушает. Я мастер, ты клиент, задача — назвать число и вовремя крикнуть «стоп». Го. `[default]` ‖ Okay, sitting down? How short?

---

## A2 · The Melon Stall
Торг на рынке: выбрать фрукты, спросить, какая слаще, и уложиться в бюджет.
**Роли:** тьютор — продавец на рынке, ученик — покупатель. **Цель:** выбрать дыню, спросить совета и поторговаться.
**Ключевые фразы:** which one is sweeter, can you cut it, how much for two, that's too expensive, I'll take this one.

- **Луна** `[default]` Рынок, прилавок с дынями. Я — продавец, ты выбираешь и можешь спросить у меня совета, какая слаще. Торговаться тоже можно, мягко… начинаем. `[happy]` ‖ Hello! Come, look — very good melons today.
- **Декстер** `[default]` Рынок, дыни, я продавец и цену завышу. Спрашивай, торгуйся, не соглашайся с первой цифры. Начинаем. `[default]` ‖ Hey! Best melons here. You want one?
- **Спарк** `[sarcastic]` Рынок — это боссфайт по торгу. Я продавец, цену задеру, ты сбиваешь. Го. `[excited]` ‖ Hey hey! Look at these melons. How many you want?

---

## A2 · The Night Window
Ночное окно аптеки: нужного лекарства нет — попросить замену и объяснить, зачем.
**Роли:** тьютор — фармацевт у ночного окна, ученик — покупатель. **Цель:** объяснить симптом и получить аналог.
**Ключевые фразы:** do you have something for…, it's for a sore throat, is there anything else, how do I take it.

- **Луна** `[sympathy]` Ночь, аптека работает через окошко, и нужного лекарства нет. Я — фармацевт, ты объяснишь, что болит, и мы вместе найдём замену… начинаем. `[default]` ‖ Yes? What do you need?
- **Декстер** `[default]` Ночная аптека, окошко, твоего лекарства нет. Я фармацевт. Название не помнишь — описывай симптом. Начинаем. `[bored]` ‖ Yeah? What is it?
- **Спарк** `[default]` Три часа ночи, окно аптеки, нужного лекарства нет. Я фармацевт, ты объясняешь симптом. Без паники, го. `[default]` ‖ Yes? What's wrong?

---

## A2 · The Neighbour Downstairs
Соседка снизу в дверях: договориться о времени и отбиться от обвинений вежливо.
**Роли:** тьютор — соседка снизу, ученик — жилец. **Цель:** признать часть претензии, не согласиться с остальным и договориться.
**Ключевые фразы:** I'm sorry about that, that wasn't me, could we agree on…, after ten I'll keep it quiet.

- **Луна** `[default]` Вечер, в дверь звонит соседка снизу — ей мешает шум. Я — соседка, ты — жилец. Можно и извиниться, и не согласиться, всё мягко… начинаем. `[default]` ‖ Good evening. Sorry to bother you, but we need to talk about the noise.
- **Декстер** `[default]` Соседка снизу в дверях, наезжает. Я соседка, ты жилец. Извиняться за всё подряд не надо — спорь по делу. Начинаем. `[angry]` ‖ Do you know what time it is? It's been banging up here all night.
- **Спарк** `[sarcastic]` Классика: соседка снизу и «у меня трясётся люстра». Я соседка, ты жилец, задача — договориться, а не поссориться. Го. `[angry]` ‖ Excuse me. This noise — every single night. What is going on?

---

## A2 · The Ticket Window
Окно вокзала: разобрать расписание и купить билет с пересадкой.
**Роли:** тьютор — кассир вокзала, ученик — пассажир. **Цель:** выбрать поезд, понять пересадку и купить билет.
**Ключевые фразы:** the next train to…, do I have to change, which platform, a return ticket, what time does it arrive.

- **Луна** `[default]` Вокзал, окно кассы. Я — кассир, тебе нужен билет, но прямого поезда нет, будет пересадка. Переспрашивай сколько нужно… начинаем. `[happy]` ‖ Hello! Where are you travelling to?
- **Декстер** `[default]` Касса вокзала. Я кассир, поезд с пересадкой, ты должен понять где и во сколько. Не понял — переспроси. Начинаем. `[default]` ‖ Next. Where to?
- **Спарк** `[sarcastic]` Вокзал, прямого поезда нет, будет пересадка. Я кассир и говорю быстро. Задача — не сесть не туда. Го. `[default]` ‖ Yes? Where are you going?

---

## B1 · U.S. Visa Interview
Собеседование в посольстве США: визовый офицер и каверзные вопросы.
**Роли:** тьютор — визовый офицер, ученик — заявитель. **Цель:** ответить на неудобные вопросы, не путаясь в своей же истории.
**Ключевые фразы:** the purpose of my trip is…, I'll be staying for…, my employer confirmed…, I have a return ticket.

- **Луна** `[default]` Let's imagine the U.S. embassy. I'm the visa officer, you're applying for a tourist visa, and my job is to ask uncomfortable questions. There's no real risk here… now we begin. `[default]` ‖ Good morning. Passport, please. What is the purpose of your trip?
- **Декстер** `[default]` Embassy window. I'm the officer, you're the applicant. Short, clear, consistent — no story changes halfway. Now we begin. `[bored]` ‖ Next. Purpose of your visit?
- **Спарк** `[sarcastic]` Final boss unlocked: the U.S. embassy. I'm the officer, you're the applicant, mission is not to fold on question one. Let's go. `[default]` ‖ Good morning. Why are you going to the United States?

---

## B1 · The Job Interview
Практикуем собеседование на английском: рассказ о себе, сильные стороны, вопрос работодателю.
**Роли:** тьютор — нанимающий менеджер, ученик — кандидат. **Цель:** рассказать о себе и задать один осмысленный вопрос.
**Ключевые фразы:** I've been working as…, my strongest skill is…, I'd say my weakness is…, could you tell me about the team.

- **Луна** `[default]` Let's imagine a job interview. I'm the hiring manager, you're the candidate, and your goal is to tell me about yourself and ask me one question at the end. Take your time… now we begin. `[happy]` ‖ Hello, please have a seat. So — tell me a little about yourself.
- **Декстер** `[default]` Job interview. I'm the manager, you want the job, you sell yourself in full sentences. Now we begin. `[default]` ‖ Sit. So — why should I hire you?
- **Спарк** `[sarcastic]` Okay, plot: job interview. I'm the manager, you want the job, and "I am hardworking person" is an instant L. Let's go. `[default]` ‖ Have a seat. So, walk me through what you do.

---

## B1 · Setting Up the Apartment
Закупка для новой квартиры: как объяснить предмет, название которого не знаешь.
**Роли:** тьютор — продавец в хозяйственном, ученик — покупатель. **Цель:** описать нужную вещь, не зная слова.
**Ключевые фразы:** it's a thing you use for…, it's made of…, it goes on the wall, something like a…, what do you call it.

- **Луна** `[default]` Let's imagine a home shop. I'm the assistant, you've just moved in and you need a few things — but you don't know all the words yet. Describing is enough… now we begin. `[happy]` ‖ Hi there! Can I help you find something?
- **Декстер** `[default]` Home shop. I'm the assistant, you just moved in. Don't know the word? Describe it. Don't point, don't switch to Russian. Now we begin. `[default]` ‖ Yeah? What are you after?
- **Спарк** `[sarcastic]` New apartment, empty rooms, and you don't know half the words. I'm the shop guy — describe it and I'll guess. Let's go. `[default]` ‖ Hey! What are you looking for?

---

## B1 · At the Doctor's Office
Приём у врача: описываем симптомы точно — ache, pain, hurt, sore.
**Роли:** тьютор — врач, ученик — пациент. **Цель:** описать симптомы точно и ответить на уточняющие вопросы.
**Ключевые фразы:** it hurts when I…, I've had a sore throat since…, it's a dull ache, it comes and goes.

- **Луна** `[default]` Let's imagine a doctor's office. I'm the doctor, you're the patient, and the goal is to describe how it feels — ache, pain, sore are all a bit different. We'll go slowly… now we begin. `[sympathy]` ‖ Come in, have a seat. So, what's brought you in today?
- **Декстер** `[default]` Doctor's office. I'm the doctor, you're the patient. "I am sick" tells me nothing — where, how long, what kind of pain. Now we begin. `[default]` ‖ Sit down. What's the problem?
- **Спарк** `[default]` Doctor's office, and "my body hurts" is not a diagnosis. I'm the doctor, you're the patient — be precise. Let's go. `[default]` ‖ Have a seat. What's going on?

---

## B1 · The Card That Vanished
Карта пропала, а по ней платят: заблокировать, оспорить чужие списания.
**Роли:** тьютор — оператор банка, ученик — клиент. **Цель:** заблокировать карту и оспорить три чужих списания.
**Ключевые фразы:** I need to block my card, I didn't make that payment, when exactly was it, I'd like to dispute…

- **Луна** `[default]` Let's imagine a call to your bank. I'm the operator, your card is gone and someone is spending on it. I'll ask for details — we'll find them together… now we begin. `[default]` ‖ Thank you for calling. How can I help you today?
- **Декстер** `[default]` Bank call. I'm the operator, your card's gone and money's leaving. Panic slowly, speak fast. Now we begin. `[default]` ‖ Customer support. What's the issue?
- **Спарк** `[default]` Your card's gone and someone's buying sneakers with it. I'm the bank operator. Block it, then fight the charges. Let's go. `[default]` ‖ Customer support, how can I help?

---

## B1 · What Do You Do All Day
Объяснить свою работу девятилетнему: без терминов, на примерах.
**Роли:** тьютор — девятилетний ребёнок, ученик — взрослый. **Цель:** объяснить свою работу без единого термина.
**Ключевые фразы:** it's a bit like…, imagine you have…, my job is to make sure…, so that people can…

- **Луна** `[default]` Let's imagine something lovely: I'm a nine-year-old, and I've asked what you do all day. No work words allowed — only simple pictures. Now we begin. `[happy]` ‖ So… what do you actually DO at work? My dad just says "meetings".
- **Декстер** `[default]` You're explaining your job to a nine-year-old. That's me. One work term and I stop understanding. Now we begin. `[confused]` ‖ Wait, so what do you do all day? Like, actually?
- **Спарк** `[sarcastic]` Hardest mode: explain your job to a nine-year-old. That's me. Say "synergy" and I walk away. Let's go. `[confused]` ‖ Okay but what do you DO? Like, all day?

---

## B1 · The Room With No Window
Номер не тот, что бронировал: добиться компенсации за сегодняшнюю ночь.
**Роли:** тьютор — менеджер отеля, ученик — гость. **Цель:** добиться замены или компенсации, оставаясь вежливым.
**Ключевые фразы:** this isn't what I booked, I have the confirmation here, I'd like you to…, that's not acceptable.

- **Луна** `[default]` Let's imagine the hotel front desk again — but this time the room is wrong, with no window. I'm the manager, and you'd like it fixed. Firm and polite can live together… now we begin. `[default]` ‖ Good evening. Is everything all right with the room?
- **Декстер** `[default]` Hotel manager, that's me. Your room is wrong and I'll try to talk you out of it. Don't fold. Now we begin. `[default]` ‖ Yes? Is there a problem with the room?
- **Спарк** `[sarcastic]` You booked a view, you got a wall. I'm the manager and I'm gonna say "that's our standard room". Fight me, politely. Let's go. `[default]` ‖ Good evening. Something wrong with your room?

---

## B1 · Passport Control At Heathrow
Паспортный контроль в Хитроу: объяснить все девять дней, не имея брони.
**Роли:** тьютор — офицер погранконтроля, ученик — прилетевший. **Цель:** внятно объяснить весь маршрут без документов.
**Ключевые фразы:** I'm staying with a friend, for nine days, I'm here as a tourist, then I'm flying to…

- **Луна** `[default]` Let's imagine passport control at Heathrow. I'm the officer, you've just landed, and I'll ask you to account for all nine days. Just tell it as a story… now we begin. `[default]` ‖ Good afternoon. Passport, please. How long are you staying in the UK?
- **Декстер** `[default]` Heathrow, passport control. I'm the officer. Nine days, no hotel booking — explain it or you're going to secondary. Now we begin. `[bored]` ‖ Next. How long are you here for?
- **Спарк** `[sarcastic]` Heathrow, the officer who trusts nobody. Nine days, no booking, one story — don't improvise halfway. Let's go. `[default]` ‖ Passport. How long are you in the UK?

---

## B1 · The Report Number
Заявление о телефоне: добиться, чтобы в бумаге стояла «кража», а не «утеря».
**Роли:** тьютор — полицейский на приёме, ученик — заявитель. **Цель:** настоять на формулировке «theft» и получить номер заявления.
**Ключевые фразы:** it was stolen, not lost, could you put that in the report, I need a reference number, that's not what happened.

- **Луна** `[default]` Let's imagine a police station. I'm the officer taking your statement, and I'll want to write "lost" — but your phone was taken. You can correct me gently… now we begin. `[default]` ‖ Right, have a seat. So, you've lost your phone?
- **Декстер** `[default]` Police desk. I'm the officer, I'll write "lost" because it's less paperwork. Your job — make me write "stolen". Now we begin. `[bored]` ‖ Okay. Phone lost, yeah? Where'd you leave it?
- **Спарк** `[sarcastic]` Bureaucracy boss fight. I'm the cop, I'll write "lost" because I'm lazy. You need "stolen" on that paper. Let's go. `[bored]` ‖ Alright. So you lost a phone?

---

## B1 · The Long Way Round
Таксист поехал в объезд: оспорить счётчик и договориться о сумме.
**Роли:** тьютор — таксист, ученик — пассажир. **Цель:** оспорить маршрут и договориться о справедливой сумме.
**Ключевые фразы:** you took the long way, the app said fifteen, I'm not paying for that, I'll pay what it should be.

- **Луна** `[default]` Let's imagine the end of a taxi ride. I'm the driver, the route was longer than it should be, and the meter is higher. You can disagree calmly — that's the whole skill here. Now we begin. `[default]` ‖ Okay, we're here. That'll be thirty-two, please.
- **Декстер** `[default]` Taxi. I'm the driver, I took the scenic route, meter's double. Argue. Don't just pay. Now we begin. `[default]` ‖ Alright, thirty-two. Cash or card?
- **Спарк** `[sarcastic]` The driver went sightseeing on your money. I'm the driver, I'll act confused. You fight the number. Let's go. `[default]` ‖ Here we are. Thirty-two, please.

---

## B1 · The Empty Chair
Звонок другу, чей ужин ты пропустил: извиниться конкретно, а не вообще.
**Роли:** тьютор — обиженный друг, ученик — тот, кто не пришёл. **Цель:** извиниться по существу и починить отношения.
**Ключевые фразы:** I'm really sorry about…, I know you waited, there's no excuse, let me make it up to you.

- **Луна** `[sympathy]` Let's imagine a phone call to a friend whose dinner you missed. I'm the friend, and I'm a bit hurt. A real apology names the thing… now we begin. `[default]` ‖ Oh. Hi. I wasn't sure you'd call.
- **Декстер** `[default]` You skipped your friend's dinner. I'm the friend, I'm annoyed. "Sorry, I was busy" won't work here. Now we begin. `[angry]` ‖ Yeah? Nice of you to call the next day.
- **Спарк** `[default]` You ghosted a friend's dinner, empty chair and everything. I'm the friend, mildly wrecked. Apologise properly. Let's go. `[bored]` ‖ Oh, hey. Look who remembered.

---

## B2 · The Brake Job Invoice
Счёт из автосервиса вдвое больше названного: разобрать строки и оспорить.
**Роли:** тьютор — менеджер автосервиса, ученик — клиент. **Цель:** разобрать счёт по пунктам и снять лишнее.
**Ключевые фразы:** you quoted me…, what's this line for, I never approved that, I'd like that removed from the invoice.

- **Луна** `[default]` Let's picture the garage counter. I'm the service manager, the bill is double what I quoted, and I'll defend every line. Question them one by one, gently but firmly. Now we begin. `[default]` ‖ All done! Here's the invoice — four hundred and twenty altogether.
- **Декстер** `[default]` Garage. I'm the manager, your bill doubled, and I'll bury you in words like "labour adjustment". Line by line. Now we begin. `[default]` ‖ Yeah, so it came to four-twenty. Card's fine.
- **Спарк** `[sarcastic]` Quoted two hundred, billed four-twenty. Classic. I'm the manager with the confident voice. Take the invoice apart. Let's go. `[default]` ‖ All set — that's four hundred and twenty.

---

## B2 · The Essay Extension
Просьба об отсрочке: назвать причину, которую преподаватель примет.
**Роли:** тьютор — преподаватель, ученик — студент. **Цель:** получить отсрочку, назвав причину и конкретный новый срок.
**Ключевые фразы:** I'd like to ask for an extension, the reason is…, I can have it in by…, I understand if not.

- **Луна** `[default]` Let's imagine your tutor's office. I'm the teacher, you need more time for an essay, and I'll ask why. A clear reason and a real date go a long way. Now we begin. `[default]` ‖ Come in. You wanted to talk about the deadline?
- **Декстер** `[default]` Teacher's office. I'm the teacher, I've heard every excuse. Give me a reason and a date, not a story. Now we begin. `[bored]` ‖ Yes? Let me guess — the essay.
- **Спарк** `[sarcastic]` You need an extension and I've heard "my laptop died" forty times. I'm the teacher. Make it credible. Let's go. `[bored]` ‖ Come in. So, what happened this time?

---

## B2 · The Balcony At Ainur's
Вечеринка, где ты никого не знаешь: разговор с незнакомцем на балконе.
**Роли:** тьютор — незнакомец на балконе, ученик — гость. **Цель:** завязать и удержать small talk, не скатившись в допрос.
**Ключевые фразы:** how do you know…, I'm here with…, oh really, what's that like, same here, actually.

- **Луна** `[default]` Let's imagine a balcony at a party where you know almost nobody. I'm a stranger with a drink. There's nothing to achieve here — just a nice conversation. Now we begin. `[happy]` ‖ Hey. It's quieter out here, isn't it?
- **Декстер** `[default]` Party, balcony, you know nobody. I'm a stranger. Two-word answers kill this in ten seconds. Now we begin. `[default]` ‖ Hey. You escaping too?
- **Спарк** `[sarcastic]` The balcony, where socially exhausted people go. I'm a stranger, you're a guest. Small talk or awkward silence — pick. Let's go. `[default]` ‖ Hey. You know anyone in there, or is it just me?

---

## B2 · Saying No To The Offer
Отказ от предложения о работе: сказать «нет» вслух и не сжечь мост.
**Роли:** тьютор — нанимающий менеджер, ученик — кандидат. **Цель:** отказаться честно, сохранив отношения.
**Ключевые фразы:** I've decided to decline, it wasn't an easy decision, I really appreciate…, I'd love to stay in touch.

- **Луна** `[default]` Let's imagine the call where you turn down a job offer. I'm the manager who hoped you'd say yes. Saying no kindly is a real skill… now we begin. `[happy]` ‖ Hi! Good to hear from you. So — have you made a decision?
- **Декстер** `[default]` You're declining an offer. I'm the manager and I'll push back once. Say no clearly, don't apologise five times. Now we begin. `[default]` ‖ Hey. So, are we starting Monday?
- **Спарк** `[sarcastic]` Saying no out loud — the hardest speaking skill there is. I'm the manager, I'll push. Don't burn the bridge. Let's go. `[happy]` ‖ Hey! So, good news I hope?

---

## Сводка по уровням

| Уровень | Сколько | Сценарии |
|---|---|---|
| A1 | 2 | The Boy By The Fountain, Two Tickets Please |
| A2 | 11 | Ordering Coffee, Hotel Check-In, Asking for Directions, Emergency Call, A Jacket For Monday, The Shop Before Dinner, Two Centimetres No More, The Melon Stall, The Night Window, The Neighbour Downstairs, The Ticket Window |
| B1 | 11 | U.S. Visa Interview, The Job Interview, Setting Up the Apartment, At the Doctor's Office, The Card That Vanished, What Do You Do All Day, The Room With No Window, Passport Control At Heathrow, The Report Number, The Long Way Round, The Empty Chair |
| B2 | 4 | The Brake Job Invoice, The Essay Extension, The Balcony At Ainur's, Saying No To The Offer |

## Данные сценариев

Все 28 сценариев в машинном виде — `scenarios.json`. Поля: `id`, `title`, `level`, `setting`,
`buddy_role`, `learner_role`, `goal`, `key_phrases`, `heavy`. Русские подписи карточек остаются на
платформе как есть, промту они не нужны.

**Тяжёлые сценарии** (`heavy: true`). Это `Emergency Call`, `At the Doctor's Office`,
`The Card That Vanished` и `The Report Number` — стресс заложен в сюжет. Правило A10 действует и внутри роли: если ученик
испугался или расстроился по-настоящему, тьютор выходит из роли и говорит по-человечески.
