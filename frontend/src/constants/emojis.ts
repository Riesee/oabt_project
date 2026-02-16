export const SUBJECT_EMOJIS: { [key: string]: string } = {
    // Bilim ve Doğa
    'Biyoloji': '🧬',
    'Kimya': '🧪',
    'Fizik': '⚛️',
    'Fen Bilimleri': '🔬',
    'Astronomi': '🚀',
    'Çevre': '🌱',

    // Sayısal
    'Matematik': '🧮',
    'Geometri': '📐',
    'İstatistik': '📊',
    'Ekonomi': '📉',

    // Sosyal Bilimler
    'Tarih': '🏛️',
    'Coğrafya': '🗺️',
    'Sosyoloji': '👥',
    'Felsefe': '🤔',
    'Psikoloji': '🧠',
    'Rehberlik': '🤝',
    'PDR': '🤝',
    'Hukuk': '⚖️',

    // Dil ve Edebiyat
    'Edebiyat': '✍️',
    'Türk Dili ve Edebiyatı': '📜',
    'Türkçe': '📖',
    'Dilbilgisi': '🔤',

    // Sanat ve Spor
    'Müzik': '🎵',
    'Görsel Sanatlar': '🎨',
    'Resim': '🖌️',
    'Beden Eğitimi': '⚽',
    'Spor': '🏆',

    // Mesleki ve Teknik
    'Bilişim Teknolojileri': '💻',
    'Yazılım': '👨‍💻',
    'Robotik': '🤖',
    'Eczacılık': '💊',
    'Din Kültürü': '🕌',
    'Okul Öncesi': '🧸',
    'Sınıf Öğretmenliği': '🎒',

    // Genel
    'Genel Kültür': '💡',
    'Eğitim Bilimleri': '👩‍🏫',
    'Güncel Bilgiler': '🔔',
    'Deneme': '📝',
    'Sınav': '⏱️',
    'default': '📚'
};

export interface EmojiOption {
    id: string;
    char: string;
}

// Profil seçimi için kullanılacak eğlenceli emoji listesi
export const AVATAR_EMOJIS: EmojiOption[] = [
    { id: 'bust', char: '👤' },
    { id: 'teacher_m', char: '👨‍🏫' },
    { id: 'teacher_w', char: '👩‍🏫' },
    { id: 'grad_cap', char: '🎓' },
    { id: 'books', char: '📚' },
    { id: 'pencil', char: '✏️' },
    { id: 'brain', char: '🧠' },
    { id: 'rocket', char: '🚀' },
    { id: 'star', char: '⭐' },
    { id: 'owl', char: '🦉' },
    { id: 'lion', char: '🦁' },
    { id: 'fox', char: '🦊' },
    { id: 'unicorn', char: '🦄' },
    { id: 'robot', char: '🤖' },
    { id: 'alien_monster', char: '👾' },
    { id: 'rainbow', char: '🌈' },
    { id: 'fire', char: '🔥' },
    { id: 'zap', char: '⚡' },
    { id: 'bulb', char: '💡' },
    { id: 'gem', char: '💎' },
    { id: 'palette', char: '🎨' },
    { id: 'performing_arts', char: '🎭' },
    { id: 'musical_score', char: '🎼' },
    { id: 'earth', char: '🌍' },
    { id: 't-rex', char: '🦖' },
    { id: 'panda', char: '🐼' },
    { id: 'cat', char: '🐱' },
    { id: 'dog', char: '🐶' },
    { id: 'pizza', char: '🍕' },
    { id: 'ice_cream', char: '🍦' },
    { id: 'video_game', char: '🎮' },
    { id: 'basketball', char: '🏀' },
    { id: 'guitar', char: '🎸' },
    { id: 'yoga', char: '🧘' },
    { id: 'superhero', char: '🦸' },
    { id: 'ninja', char: '🥷' },
    { id: 'balloon', char: '🎈' }
];

export const getEmojiById = (id: string): string => {
    const emoji = AVATAR_EMOJIS.find(e => e.id === id);
    return emoji ? emoji.char : (id.length <= 2 ? id : '👤'); // If it's already an emoji, return it, else fallback
};
