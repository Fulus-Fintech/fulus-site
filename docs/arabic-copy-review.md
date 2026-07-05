# Arabic Copy Review — fulus.sa

**What this is.** A one-pass review sheet covering all 87 UI strings on the fulus.sa
landing page, waitlist flow, confirmation screen, and privacy page — English source
next to the current Arabic draft, for a native Saudi Arabic speaker to check and sign
off.

**How to use it.**
1. Go section by section, in page order.
2. For each row, read the English for intended meaning, check the **Register**
   column for the voice that string is supposed to land in, then read the Arabic
   draft against both.
3. Write any correction into the **Suggested correction** column (left blank for
   you). If a row is fine as-is, leave it blank or mark it ✓ — whichever you prefer.
4. Rows with a `†`, `‡`, or `§` mark after the key have a special note — see
   **Notes for the reviewer** near the end before you touch them.
5. **Everything in the Arabic column is a draft.** None of it is final copy.

**Ship gate.** No Arabic string on this site goes to production until a native
speaker has reviewed and signed off on every row in this document.

**Register key** used in the table below:
- **Colloquial** — Saudi-colloquial, conversational voice (the Tabby / stc-bank
  register). This is the intended register for all marketing/section copy.
- **MSA** — Modern Standard Arabic. Intended for footer, privacy, and legal text.
- **Neutral (a11y)** — functional/accessibility strings (skip links, alt text,
  form labels). Judge these for accuracy and clarity, not for colloquial voice.

---

## 1. Meta / SEO

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `meta.title` | Fulus — Where your circle invests | فلوس — استثمار جماعي بحساب واضح | Colloquial | |
| `meta.description` | Fulus is the app for families and friends in Saudi Arabia and the Gulf who invest together — pooled contributions, recorded votes, exact ownership, clean settlements. Private beta, now onboarding. | فلوس تطبيق للعوائل والأصدقاء اللي يستثمرون مع بعض في السعودية والخليج — مساهمات مجمعة، تصويت موثق، حصص مضبوطة، وتسوية كل دورة بدقائق. نسخة تجريبية خاصة، والتسجيل مفتوح. | Colloquial | |

## 2. Header + a11y

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `header.cta` | Join the Waitlist | انضم لقائمة الانتظار | Colloquial | |
| `a11y.skip` | Skip to content | تخطَّ إلى المحتوى | Neutral (a11y) | |
| `a11y.lang` | Language | اللغة | Neutral (a11y) | |
| `a11y.home` | Fulus — home | فلوس — الصفحة الرئيسية | Neutral (a11y) | |
| `a11y.hero.alt` | The Fulus club dashboard seen through the Fulus portal — Noor Family Club, balances and a live vote | لوحة نادي فلوس تظهر عبر بوابة فلوس — نادي عائلة نور، الأرصدة وتصويت جارٍ | Neutral (a11y) | |
| `a11y.email.label` | Email address | البريد الإلكتروني | Neutral (a11y) | |
| `a11y.referral.label` | Your referral link | رابط الدعوة الخاص بك | Neutral (a11y) | |

## 3. Hero

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `hero.head` | Where your circle invests. | المكان اللي ربعك يستثمرون فيه. | Colloquial | |
| `hero.sub` | Fulus runs the money side for families and friends who invest together in Saudi Arabia and the Gulf. | فلوس يمسك لك حسابات المجموعة — للعوائل والأصدقاء اللي يستثمرون مع بعض في السعودية والخليج. | Colloquial | |
| `hero.beta` | Private beta — now onboarding. | نسخة تجريبية خاصة — التسجيل مفتوح الآن. | Colloquial | |
| `hero.form.note` | No spam — launch updates only. | بدون إزعاج — تحديثات الإطلاق وبس. | Colloquial | |

## 4. Problem

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `problem.head` | Someone always carries the books. | دايم في واحد شايل الدفتر. | Colloquial | |
| `problem.p1` | Every group has one: the member who owns the spreadsheet, chases the transfers, and stays up reconciling other people's money. | كل مجموعة فيها واحد: اللي عنده ملف الإكسل، يلاحق التحويلات، ويسهر يطابق فلوس غيره. | Colloquial | |
| `problem.p2` | Votes happen in WhatsApp and evaporate. Numbers live in one person's head. Trust does all the accounting — until it can't. | التصويت يصير بالواتساب ويضيع. الأرقام في راس شخص واحد. والثقة هي المحاسب — لين ما تكفي. | Colloquial | |
| `problem.alt` | A lone silhouette figure surrounded by drifting spreadsheet fragments | شخص واحد بظل داكن حوله قصاصات جداول متناثرة | Neutral (a11y) | |
| `problem.frag.1` | Who paid last cycle? | مين دفع الدورة اللي راحت؟ | Colloquial | |
| `problem.frag.2` § | Sheet2 — do not edit | Sheet2 — لا تعدّل | Colloquial | |
| `problem.frag.3` § | =SUM(B2:B14) | =SUM(B2:B14) | — (untranslated formula) | |
| `problem.frag.4` § | screenshot-final-v3.jpg | screenshot-final-v3.jpg | — (untranslated filename) | |

## 5. Product (chapters)

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `product.head` | The product, shown. | المنتج، قدامك. | Colloquial | |
| `product.sub` | Real screens from the Fulus beta — this is the app your club gets today. | شاشات حقيقية من نسخة فلوس التجريبية — هذا التطبيق اللي يوصل ناديك اليوم. | Colloquial | |
| `product.ch1.head` | Pool the money, without the chasing. | اجمعوا الفلوس، بدون ملاحقة. | Colloquial | |
| `product.ch1.body` | Every member's contribution lands in one shared record — who paid, when, and the receipt to prove it. No more screenshots forwarded three times. | كل مساهمة تنسجل في سجل واحد مشترك — مين دفع، متى، ومع الإيصال. لا صور شاشة ولا تحويلات ضايعة. | Colloquial | |
| `product.ch1.alt` | Fulus beta screen showing a club's pooled contributions | شاشة من تطبيق فلوس تعرض مساهمات النادي المجمعة | Neutral (a11y) | |
| `product.ch2.head` | Decide together, on the record. | قرروا مع بعض، وبالمكتوب. | Colloquial | |
| `product.ch2.body` | Proposals get a card, members get a vote, and the outcome is stored where everyone can see it — not buried in a group chat. | كل اقتراح له بطاقة، وكل عضو له صوت، والنتيجة محفوظة قدام الكل — مو مدفونة في قروب. | Colloquial | |
| `product.ch2.alt` | Fulus beta screen showing a club vote in progress | شاشة من تطبيق فلوس تعرض تصويتًا جاريًا | Neutral (a11y) | |
| `product.ch3.head` | Every share, exact. | كل حصة، بالضبط. | Colloquial | |
| `product.ch3.body` | Fulus computes each member's ownership from their actual contributions, every cycle. No estimates, no awkward conversations. | فلوس يحسب حصة كل عضو من مساهماته الفعلية، كل دورة. لا تقديرات ولا مواقف محرجة. | Colloquial | |
| `product.ch3.alt` | Fulus beta screen showing per-member ownership | شاشة من تطبيق فلوس تعرض حصص الأعضاء | Neutral (a11y) | |
| `product.ch4.head` | Settle a cycle in minutes. | سوّوا الدورة بدقائق. | Colloquial | |
| `product.ch4.body` | Close the cycle and Fulus works out each member's share of the results — pro-rata, auditable, done before the tea gets cold. | اقفلوا الدورة وفلوس يوزع النتائج على الأعضاء — كلٌّ بنسبته، وبسجل يقدر يراجعه أي عضو. | Colloquial | |
| `product.ch4.alt` | Fulus beta screen showing a cycle settlement summary | شاشة من تطبيق فلوس تعرض ملخص تسوية الدورة | Neutral (a11y) | |

## 6. How it works

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `how.head` | How it works | الطريقة | Colloquial | |
| `how.s1.head` | Create your club | أنشئ ناديك | Colloquial | |
| `how.s1.body` | Name it, set the ground rules, and open the books in minutes. | سمّه، حطوا قواعدكم، وافتحوا السجل بدقائق. | Colloquial | |
| `how.s2.head` | Invite your circle | ادعُ ربعك | Colloquial | |
| `how.s2.body` | Members join with a link — family, friends, colleagues you already trust. | الأعضاء ينضمون برابط — أهل وأصدقاء وزملاء تثق فيهم أصلًا. | Colloquial | |
| `how.s3.head` | Invest and settle together | استثمروا وسوّوا مع بعض | Colloquial | |
| `how.s3.body` | Contribute, vote, and let Fulus keep every share exact through each cycle. | ساهموا، صوّتوا، وخلّوا فلوس يضبط كل حصة في كل دورة. | Colloquial | |
| `how.alt` | Silhouette figures walking together toward a glowing Fulus portal | مجموعة أشخاص بظلال داكنة يتجهون نحو بوابة فلوس المضيئة | Neutral (a11y) | |

## 7. Trust

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `trust.head` | Trust, plainly. | بكل صراحة. | Colloquial | |
| `trust.note` | I built Fulus because I was the one carrying my club's books. Fulus is what I wished we had: one honest record that every member can see. We're a small team in Saudi Arabia, we're in private beta, and the clubs that join now shape what we build next. | بنيت فلوس لأني كنت أنا اللي شايل دفتر نادينا. فلوس هو اللي تمنيت إنه عندنا: سجل واحد صادق يشوفه كل عضو. فريقنا صغير وفي السعودية، والنسخة تجريبية خاصة، والنوادي اللي تنضم الحين ترسم اللي نبنيه بعدين. | Colloquial | |
| `trust.name` | Ahmed — founder of Fulus | أحمد — مؤسس فلوس | Colloquial | |
| `trust.security` | Your data is encrypted. We never share your email. | بياناتك مشفرة. وإيميلك ما نشاركه مع أحد. | Colloquial | |
| `trust.beta` | Fulus is in private beta. Early clubs get direct access to the team — and shape the product. | فلوس في نسخة تجريبية خاصة. النوادي الأولى توصل للفريق مباشرة — وترسم شكل المنتج. | Colloquial | |

## 8. Vision

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `vision.kicker` | The road ahead | الطريق القدام | Colloquial | |
| `vision.head` | Built for the future. Available today. | مبني للمستقبل. متاح اليوم. | Colloquial | |
| `vision.body` | We are building toward a treasury every member can verify for themselves — the same shared record, provable rather than promised. What you join today is the working product; the road ahead only deepens it. | نبني نحو خزينة يقدر كل عضو يتحقق منها بنفسه — نفس السجل المشترك، لكن مثبت مو موعود. اللي تنضم له اليوم منتج شغال، والقادم يزيده وضوح. | Colloquial | |

## 9. Final CTA

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `cta.head` | Your invite is on the other side. | دعوتك على الجهة الثانية. | Colloquial | |
| `cta.next` | Invites go out in waves. Your email gets launch updates — nothing else. | الدعوات تطلع على دفعات. إيميلك يجيه تحديثات الإطلاق — وبس. | Colloquial | |

## 10. Confirmation state

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `confirm.title` | You're on the list. | تم — إنت في القائمة. | Colloquial | |
| `confirm.position` † | You're #{n} in line. | ترتيبك رقم {n}. | Colloquial | |
| `confirm.already` † | You're already on the list — you're #{n}. | إنت مسجل من قبل — ترتيبك {n}. | Colloquial | |
| `confirm.referral.head` | Bring your club. | جيب ناديك معك. | Colloquial | |
| `confirm.referral.sub` | Referrals move you into earlier invite waves. | كل دعوة تقدّمك لدفعات أبكر. | Colloquial | |
| `confirm.count` † | {n} joined through your link. | {n} انضموا من رابطك. | Colloquial | |
| `confirm.share` | Share on WhatsApp | شارك عبر واتساب | Colloquial | |
| `confirm.copy` | Copy Link | انسخ الرابط | Colloquial | |
| `confirm.copied` | Copied | تم النسخ | Colloquial | |
| `confirm.profile.q1` | Your club — existing or new? | عندكم نادي، أو بتبدأون من جديد؟ | Colloquial | |
| `confirm.profile.q1.existing` | We already invest together | عندنا نادي من قبل | Colloquial | |
| `confirm.profile.q1.new` | Starting fresh | بنبدأ من جديد | Colloquial | |
| `confirm.profile.q2` | How many people? | كم شخص؟ | Colloquial | |
| `confirm.profile.thanks` | Noted — thanks. | وصلت — شكرًا. | Colloquial | |

## 11. Waitlist form messages

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `form.cta` | Save My Spot | احجز مكاني | Colloquial | |
| `form.sending` | Sending… | لحظة… | Colloquial | |
| `form.err.invalid` | That email doesn't look right — check it and try again. | الإيميل شكله غير صحيح — تأكد منه وحاول مرة ثانية. | Colloquial | |
| `form.err.network` | Couldn't reach the server — try again. | ما قدرنا نوصل للخادم — حاول مرة ثانية. | Colloquial | |
| `form.err.captcha` | Verification didn't pass — try again. | التحقق ما نجح — حاول مرة ثانية. | Colloquial | |
| `form.err.generic` | Something went wrong on our side — try again in a moment. | صار خلل عندنا — حاول بعد شوي. | Colloquial | |

## 12. Footer

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `footer.disclosure` | Fulus is in private beta. Waitlist emails are stored with Fulus and never shared. | «فلوس» في مرحلة تجريبية خاصة. تُحفظ رسائل قائمة الانتظار لدى «فلوس» ولا تُشارك مع أي طرف. | MSA | |
| `footer.privacy` | Privacy | الخصوصية | MSA | |
| `footer.copyright` § | © 2026 Fulus. All rights reserved. | © 2026 فلوس. جميع الحقوق محفوظة. | MSA | |

## 13. Privacy page

| Key | English | Arabic (current draft) | Register | Suggested correction |
|---|---|---|---|---|
| `privacy.title` | Privacy — Fulus | الخصوصية — فلوس | MSA | |
| `privacy.head` | Privacy | الخصوصية | MSA | |
| `privacy.intro` ‡ | This page covers the fulus.sa waitlist. Plain language, short on purpose. | هذه الصفحة تخص قائمة انتظار ‎fulus.sa‎. لغة واضحة ومختصرة عن قصد. | MSA | |
| `privacy.store.head` | What we store | ما الذي نخزنه | MSA | |
| `privacy.store.body` | Your email address, your language preference, and — if you answer the optional questions — whether you have a club and how big it is. That's the whole list. | بريدك الإلكتروني، ولغتك المفضلة، وإن أجبت عن السؤالين الاختياريين: هل لديك نادٍ وكم عدد أعضائه. هذه القائمة كاملة. | MSA | |
| `privacy.why.head` | Why we store it | لماذا نخزنه | MSA | |
| `privacy.why.body` | To hold your place in line, to send you launch updates, and to invite you when your wave opens. Your email is never sold or shared with anyone. | لحفظ ترتيبك في القائمة، وإرسال تحديثات الإطلاق، ودعوتك عند فتح دفعتك. بريدك لا يُباع ولا يُشارك مع أي جهة. | MSA | |
| `privacy.removal.head` | Want off the list? | تريد الحذف من القائمة؟ | MSA | |
| `privacy.removal.body` | Send an email from the address you signed up with and we'll delete your record. Reach us at | أرسل رسالة من البريد نفسه الذي سجّلت به وسنحذف سجلّك. تجدنا على | MSA | |
| `privacy.pdpl` | We handle this data in line with the principles of Saudi Arabia's Personal Data Protection Law (PDPL). | نتعامل مع هذه البيانات وفق مبادئ نظام حماية البيانات الشخصية في المملكة العربية السعودية. | MSA | |
| `privacy.back` ‡ | Back to fulus.sa | الرجوع إلى ‎fulus.sa‎ | MSA | |

---

## Notes for the reviewer

**† Live-number interpolation (3 keys): `confirm.position`, `confirm.already`, `confirm.count`.**
`{n}` is a placeholder the site's JavaScript replaces with a real number at
runtime (queue position / referral count) — it is not literal text to translate.
Keep the exact literal string `{n}` in the Arabic if you edit these rows; don't
translate it, rename it, or change its punctuation/spacing relative to the
surrounding words. At runtime the rendered number is wrapped in an `<bdi>` tag
(bidirectional isolate) so it displays correctly regardless of digit direction —
this is handled in code, not in the copy, but it's worth knowing while you judge
how the sentence reads with a number dropped in.

**‡ LRM-isolated Latin run (2 keys): `privacy.intro`, `privacy.back`.**
Both strings embed the Latin run `fulus.sa` wrapped in U+200E (LEFT-TO-RIGHT MARK)
characters — one immediately before and one immediately after — to keep the
Latin domain name from being visually re-ordered inside the surrounding Arabic
(RTL) sentence. These marks are invisible in normal rendering. **If you edit
either string, preserve the LRM marks around `fulus.sa`** (don't retype the
domain name as plain text without them, and don't let a find/replace strip
them). If you're not sure whether your editor preserved them, ask engineering
to diff the raw JSON before it ships.

**§ Latin/numeral embeds worth double-checking (5 keys): `problem.frag.2`, `problem.frag.3`, `problem.frag.4`, `footer.copyright`, plus the two LRM keys above.**
- `problem.frag.2` (`Sheet2 — لا تعدّل`), `problem.frag.3` (`=SUM(B2:B14)`), and
  `problem.frag.4` (`screenshot-final-v3.jpg`) are floating "spreadsheet debris"
  decorating the Problem section — they're deliberately left as raw
  spreadsheet/filename text (not translated) to sell the "someone's messy Excel
  file" visual. `problem.frag.3` and `.4` are byte-identical between EN and AR
  on purpose. Flag only if the mixed Latin-in-Arabic reads awkwardly floating
  next to the fully-Arabic `problem.frag.1`.
- `footer.copyright` uses the Western numeral `2026` — confirms the "numerals
  are Western in both scripts" rule; no Eastern Arabic-Indic digits (٢٠٢٦)
  should ever be substituted in here or anywhere else on the site.

---

## Final checklist

Before signing off, confirm across the whole document:

- [ ] **Register consistency** — every row under Meta/SEO, Header (CTA only),
      Hero, Problem, Product, How it works, Trust, Vision, Final CTA,
      Confirmation state, and Waitlist form messages reads in Saudi-colloquial
      voice; every row under Footer and Privacy reads in MSA; a11y rows are
      accurate/clear regardless of voice.
- [ ] **No banned/hype vocabulary** — no exaggeration, no superlatives like
      "الأفضل"/"الأقوى", no exclamation marks, no emoji, nothing that reads like
      an ad rather than a plain statement.
- [ ] **Western numerals only** — no Eastern Arabic-Indic digits (٠١٢٣...)
      anywhere in the Arabic strings, including `{n}`-driven copy and
      `footer.copyright`.
- [ ] **Buttons read as Title-Case-equivalent commands** — `header.cta`,
      `form.cta`, `confirm.share`, `confirm.copy` (and any other button/CTA
      string) read as short, flat commands — no exclamation marks, no emoji,
      matching the EN's Title Case treatment in tone if not in casing
      (Arabic has no case system).
- [ ] **LRM marks preserved** — the U+200E marks around `fulus.sa` in
      `privacy.intro` and `privacy.back` are still present if either string
      was edited.
