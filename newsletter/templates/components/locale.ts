export type NewsletterLanguage = "en" | "mn";

const en = {
  greeting: "Hey everyone!",
  intro: "Here's what's been happening in our world this month.",
  preview: "Updates from the Batjaa family",
  family: "Family",
  professional: "Professional",
  health: "Health & Fitness",
  travel: "Travel & Adventures",
  trading: "Trading",
  randomThoughts: "Random Thoughts",
  watching: "What I've Been Watching & Listening To",
  playlist: "This month's playlist",
  listen: "Listen on Spotify",
  reading: "Reading",
  currentlyReading: "Currently reading",
  finished: "Finished",
  abandoned: "DNF",
  author: "by",
  tradingUpdate: "Trading Update",
  pnl: "Month P&L",
  positive: "Good month",
  negative: "Rough month",
  neutral: "Flat month",
  tradingChart: "Monthly trading chart",
  heroAlt: "Newsletter hero image",
  nothingNew: "Nothing new this month!",
  closing: "Thanks for reading! Reply to this email if you want to say hi - I read every response.",
  signature: "- Batjaa",
  subscribed: "You're receiving this because you subscribed to Batjaa's Newsletter.",
  unsubscribe: "Unsubscribe",
  viewInBrowser: "View in browser",
  from: "With love from Bothell, WA",
};

const mn: typeof en = {
  greeting: "Сайн байцгаана уу!",
  intro: "Энэ сард манайхаар сонин сайхан ийм байна.",
  preview: "Манай гэр бүлийн сонин сайхан",
  family: "Гэр бүл",
  professional: "Ажил, төслүүд",
  health: "Эрүүл мэнд, дасгал хөдөлгөөн",
  travel: "Аялал",
  trading: "Арилжаа",
  randomThoughts: "Элдэв бодол",
  watching: "Үзсэн кино, сонссон хөгжим",
  playlist: "Энэ сарын дууны жагсаалт",
  listen: "Spotify дээр сонсох",
  reading: "Уншиж буй номнууд",
  currentlyReading: "Уншиж байгаа",
  finished: "Уншиж дууссан",
  abandoned: "Дуусгалгүй орхисон",
  author: "Зохиолч:",
  tradingUpdate: "Арилжааны сонин",
  pnl: "Сарын ашиг, алдагдал",
  positive: "Ашигтай сар",
  negative: "Хүндхэн сар",
  neutral: "Өөрчлөлт багатай сар",
  tradingChart: "Сарын арилжааны график",
  heroAlt: "Захидлын нүүр зураг",
  nothingNew: "Энэ сард онцын сонин алга!",
  closing: "Уншсанд баярлалаа! Мэнд мэдэхийг хүсвэл энэ имэйлд хариулаарай — би хариу бүрийг уншдаг шүү.",
  signature: "- Батжаа",
  subscribed: "Та Батжаагийн захидлыг захиалсан тул энэ имэйлийг хүлээн авч байна.",
  unsubscribe: "Захиалгаа цуцлах",
  viewInBrowser: "Вэбээр унших",
  from: "Вашингтон мужийн Ботелл хотоос, хайраар",
};

export const newsletterCopy = { en, mn };
export const newsletterBaseUrl = (language: NewsletterLanguage) =>
  language === "mn" ? "https://batjargal.mn" : "https://batjaa.com";

export function formatIssueDate(dateStr: string, language: NewsletterLanguage = "en"): string {
  const date = new Date(dateStr);
  // Issue dates are calendar dates, independent of the machine's time zone.
  if (language === "mn") return `${date.getUTCFullYear()} оны ${date.getUTCMonth() + 1}-р сар`;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
