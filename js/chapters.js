/* OSPF City – chapter metadata (content lives in js/content/*.js and js/games/*.js) */
(function (OG) {
  OG.CH = [
    {
      id: 'ch1', num: 1, pack: 'base', icon: '🏚️', color: '#fb923c', block: [3, 0], en: 'Static Town',
      title: 'העיר הסטטית', topic: 'ניתוב סטטי מול דינמי · Distance Vector מול Link-State · AD · Longest Prefix',
      story: 'בעיר הנתבים כל מסלול נכתב פעם ידנית על ידי המנהל הוותיק "סטטי סטן". ביום שבו גשר קרס – כל העיר נתקעה. הגיע הזמן להבין למה ניתוב דינמי הציל את העיר, ואיך נתב מחליט בין כמה מסלולים.',
      game: 'שער המיון – שולחים חבילות ליעד הנכון לפי טבלת הניתוב'
    },
    {
      id: 'ch2', num: 2, pack: 'base', icon: '🧪', color: '#60a5fa', block: [6, 0], en: 'Link-State Lab',
      title: 'מעבדת Link-State', topic: 'OSPF · LSA · LSDB · אזורים (Area 0) · ABR / ASBR',
      story: 'ד"ר דייקסטרה מנהל מעבדה שבה כל נתב שומר מפה מלאה של העיר. כאן תבינו מה זה LSA, איך נבנית ה-LSDB, ולמה צריך לחלק את העיר לאזורים סביב עמוד השדרה (Area 0).',
      game: 'מסוע הנתבים – מסווגים נתבים לפי תפקיד: Internal / Backbone / ABR / ASBR'
    },
    {
      id: 'ch3', num: 3, pack: 'base', icon: '🤝', color: '#34d399', block: [7, 2], en: 'Hello Harbor',
      title: 'נמל ה-Hello', topic: 'הודעות Hello · יחסי שכנות (Adjacency) · Router-ID',
      story: 'בנמל, כל נתב שמגיע חייב לומר "שלום" ולהציג תעודת זהות. רק נתבים שהפרטים שלהם מתאימים הופכים לשכנים. מי שלא תואם – נשאר בחוץ.',
      game: 'בקרת הגבולות – מאשרים או דוחים זוגות נתבים ומאתרים את השדה הלא תואם'
    },
    {
      id: 'ch4', num: 4, pack: 'base', icon: '📈', color: '#fbbf24', block: [7, 5], en: 'Cost Exchange',
      title: 'בורסת העלויות', topic: 'Cost · Reference Bandwidth · bandwidth · ip ospf cost · איזון עומסים',
      story: 'בבורסה כל כביש מקבל מחיר לפי המהירות שלו. הנתב תמיד בוחר את המסלול הזול ביותר. תלמדו לחשב עלויות, לשנות אותן, ולזהות מסלולים שווים.',
      game: 'מרוץ המסלול הזול – בונים נתיב עם העלות הכוללת הנמוכה ביותר'
    },
    {
      id: 'ch5', num: 5, pack: 'base', icon: '🔐', color: '#22d3ee', block: [5, 7], en: 'Wildcard Vault',
      title: 'כספת ה-Wildcard', topic: 'Wildcard Mask · router ospf · network · passive-interface · default route · Loopback',
      story: 'כספת הבנק נפתחת רק עם קוד Wildcard נכון. כאן תלמדו להגדיר OSPF על נתב אמיתי: מה מפרסמים, מה משתיקים, ואיך מפיצים דרך ברירת מחדל.',
      game: 'פריצת הכספת – ממירים Mask↔Wildcard ומתאימים ממשקים לפקודת network'
    },
    {
      id: 'ch6', num: 6, pack: 'base', icon: '🏛️', color: '#a78bfa', block: [2, 5], en: 'Election Hall',
      title: 'בית הבחירות', topic: 'Point-to-Point מול Multi-Access · DR / BDR / DROTHER · Priority · Timers',
      story: 'כשהרבה נתבים יושבים על אותו מתג, אי אפשר שכולם ידברו עם כולם. העיר מקיימת בחירות: מי יהיה ה-DR (ראש העיר) ומי ה-BDR (סגן)?',
      game: 'יום הבחירות – קובעים מי DR ומי BDR (כולל נפילת ה-DR!)'
    },
    {
      id: 'ch7', num: 7, pack: 'base', icon: '🖥️', color: '#f472b6', block: [0, 7], en: 'Terminal Tower',
      title: 'מגדל הטרמינל', topic: 'פקודות show · קריאת טבלת ניתוב (O / IA / E2) · טבלת שכנים · interface',
      story: 'במגדל יושבים הבלשים של הרשת. הם לא מנחשים – הם קוראים פלט. תלמדו לקרוא את show ip route ואת שאר הפקודות כמו מקצוענים.',
      game: 'הבלש בטרמינל – מוצאים את השורה הנכונה בתוך פלט פקודות'
    },
    {
      id: 'ch8', num: 8, pack: 'base', icon: '🚨', color: '#ef4444', block: [5, 3], en: 'NOC – The Blackout', boss: true,
      title: 'המרכז לבקרה: האפלה הגדולה', topic: 'פתרון תקלות OSPF · סיכום כל החומר',
      story: 'הבלאקאאוט! כל העיר חשוכה ובכל הצמתים דווחו תקלות OSPF. אתם הרופאים האחרונים של הרשת. כל החומר שלמדתם מחובר כאן לתרחיש אחד גדול.',
      game: 'רופא הרשת – מאבחנים תקלות ובוחרים את התיקון הנכון'
    },
    {
      id: 'e1', num: 9, pack: 'extra', icon: '🤜', color: '#2dd4bf', block: [9, 0], en: 'Handshake Hall',
      title: 'אולם לחיצות היד', topic: 'שבעת שלבי השכנות · FULL מול 2-WAY · חמשת סוגי ההודעות (Hello/DBD/LSR/LSU/LSAck)',
      story: 'מעבר לגשר נמצא אי ההרחבה: כאן נכנסים לפרטים ש-CCNA רק מרמז עליהם. לפני שנתבים הופכים ל-FULL הם עוברים טקס שלם של לחיצת יד.',
      game: 'רכבת הלחיצות – מסדרים את שלבי השכנות וחבילות ה-OSPF'
    },
    {
      id: 'e2', num: 10, pack: 'extra', icon: '📮', color: '#f59e0b', block: [11, 1], en: 'LSA Post Office',
      title: 'דואר ה-LSA', topic: 'LSA מסוג 1 / 2 / 3 / 4 / 5 / 7 · טבלת השכנים, הטופולוגיה והניתוב · IA, E1, E2',
      story: 'לא כל LSA דומה לשני. בדואר העירוני כל מכתב נושא סוג, מי יצר אותו, ועד לאן מותר לו להגיע.',
      game: 'מיון הדואר – שולחים כל LSA לתא הנכון'
    },
    {
      id: 'e3', num: 11, pack: 'extra', icon: '🔭', color: '#818cf8', block: [10, 3], en: 'SPF Observatory',
      title: 'מצפה ה-SPF', topic: 'אלגוריתם Dijkstra · עץ מסלולים קצרים · Next-Hop',
      story: 'במצפה, דייקסטרה מראה איך נתב הופך מפה (LSDB) לעץ מסלולים קצרים. הפעם אתם האלגוריתם.',
      game: 'סייר ה-SPF – מריצים את Dijkstra צעד אחר צעד'
    },
    {
      id: 'e4', num: 12, pack: 'extra', icon: '🛃', color: '#fb7185', block: [11, 5], en: 'Special Areas Customs',
      title: 'מכס האזורים המיוחדים', topic: 'Stub · Totally Stub · NSSA · Totally NSSA · סיכום מסלולים (בונוס)',
      story: 'אזורים קטנים לא רוצים לקבל את כל המידע של העולם. במכס מחליטים איזה LSA עובר, איזה נחסם ואיזה מומר.',
      game: 'ביקורת מכס – מחליטים מה נכנס לכל סוג אזור, ומחשבים סיכומי כתובות'
    },
    {
      id: 'e5', num: 13, pack: 'extra', icon: '✈️', color: '#e879f9', block: [9, 6], en: 'Advanced Airport',
      title: 'שדה התעופה המתקדם', topic: 'אימות (Aut 0/1/2) · Virtual-Link · פרוטוקול 89 · Process ID · טיימרים Wait/Retransmit · Redistribute',
      story: 'הנחיתה האחרונה: אבטחה, חיבורים וירטואליים, הפצה מחוץ ל-OSPF ועוד. מי שמסיים כאן הוא באמת מעבר ל-CCNA.',
      game: 'כביש מהיר – נוהגים אל התשובה הנכונה בין מסלולים'
    }
  ];
  OG.chById = id => OG.CH.find(c => c.id === id);
  OG.chIndex = id => OG.CH.findIndex(c => c.id === id);
  // prerequisite: previous chapter in same pack (boss requires all base 1..7; extra 1 requires boss)
  OG.prevOf = function (id) {
    const c = OG.chById(id);
    if (id === 'ch1') return null;
    if (id === 'e1') return 'ch8';
    if (id === 'ch8') return 'ch7';
    const i = OG.chIndex(id); return OG.CH[i - 1].id;
  };
  OG.isUnlocked = function (id) {
    if (OG.state.data.settings.free) return true;
    const p = OG.prevOf(id); if (!p) return true;
    return OG.state.isComplete(p);
  };
  OG.GAME_LEVELS = {
    1: { name: 'קל', max: 100, color: '#34d399', icon: '🟢' },
    2: { name: 'בינוני', max: 200, color: '#fbbf24', icon: '🟡' },
    3: { name: 'קשה', max: 350, color: '#fb7185', icon: '🔴' }
  };
})(window.OG);
