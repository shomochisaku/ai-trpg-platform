import { PrismaClient, TemplateCategory, TemplateDifficulty } from '@prisma/client';
import { CampaignTemplateSettings } from '@/services/campaignTemplateService';

const prisma = new PrismaClient();

// Default template data based on existing frontend presets
const defaultTemplates = [
  {
    templateId: 'fantasy-adventure',
    name: 'ファンタジー冒険',
    description: '剣と魔法が息づく世界での英雄的な冒険',
    category: TemplateCategory.FANTASY,
    difficulty: TemplateDifficulty.BEGINNER,
    estimatedDuration: '2-4時間',
    playerCount: '1',
    tags: ['ファンタジー', '冒険', '魔法', '剣', '初心者向け'],
    isOfficial: true,
    scenarioSettings: {
      gmProfile: {
        personality: '私は古き良きファンタジー世界の語り部です。プレイヤーの勇敢な行動を称賛し、魔法と剣技が織りなす壮大な物語を紡ぎます。困難な状況でも希望を失わず、仲間との絆を大切にする物語を描きます。',
        speechStyle: '丁寧で叙述的な語り口調',
        guidingPrinciples: [
          'プレイヤーの選択を尊重し、創造性を促進する',
          '困難な状況でも希望の光を残す',
          '仲間との絆と協力を重視する',
          '古典的なファンタジーの魅力を伝える'
        ],
      },
      worldSettings: {
        toneAndManner: 'ファンタジー',
        keyConcepts: [
          '魔法と剣技の共存',
          '冒険者ギルドシステム',
          '多種族社会',
          '古代遺跡の謎',
          '光と闇の永続的な戦い'
        ],
        setting: `中世ファンタジーの世界「アルテミア大陸」を舞台とします。

**世界の特徴:**
- 魔法と剣技が共存する文明
- 各地に冒険者ギルドが存在
- ドラゴン、エルフ、ドワーフなどの幻想種族が住む
- 古代遺跡に眠る秘宝と謎
- 邪悪な魔王軍との永続的な戦い

**主要都市:**
- 王都カレドニア：騎士と魔術師の学院がある
- 港町ミラルディア：世界各地からの冒険者が集まる交易都市
- 森の都エルヴェンディア：エルフ族の美しい都市`,
      },
      opening: {
        prologue: `冒険者ギルド「蒼き星亭」の重厚な扉を開けると、様々な種族の冒険者たちの活気ある声が聞こえてきます。

受付嬢のエリナが微笑みかけ、「お疲れ様です、冒険者様。今日も新しい依頼が届いています。どちらになさいますか？」と声をかけます。

壁には数多くの依頼書が貼られており、その中には普通の配達依頼から、古代遺跡の調査、魔物討伐まで様々な冒険が待っています。`,
        initialStatusTags: ['健康', '冒険者', '準備完了'],
        initialInventory: ['冒険者の証', '基本装備', '少しの金貨'],
      },
      gameStyle: 'classic_fantasy',
      gmBehavior: {
        narrativeStyle: 'descriptive',
        playerAgency: 'high',
        difficultyAdjustment: 'adaptive',
      },
    } as CampaignTemplateSettings,
  },
  {
    templateId: 'cyberpunk-detective',
    name: 'サイバーパンク探偵',
    description: '企業支配の近未来都市での反体制活動',
    category: TemplateCategory.CYBERPUNK,
    difficulty: TemplateDifficulty.INTERMEDIATE,
    estimatedDuration: '3-5時間',
    playerCount: '1',
    tags: ['サイバーパンク', '近未来', '探偵', '企業陰謀', '中級者向け'],
    isOfficial: true,
    scenarioSettings: {
      gmProfile: {
        personality: '私はネオ東京の闇を知るガイドです。企業の陰謀、サイバネティック技術の光と影、そして人間性を問う物語を提供します。クールで現実的な語り口で、プレイヤーの選択が世界に与える影響を重視します。',
        speechStyle: 'クールで簡潔な現代的語り口調',
        guidingPrinciples: [
          '企業の陰謀と社会問題を織り込む',
          'テクノロジーと人間性の関係を探求する',
          'プレイヤーの選択に重大な結果をもたらす',
          'リアリスティックな現代感覚を維持する'
        ],
      },
      worldSettings: {
        toneAndManner: 'サイバーパンク',
        keyConcepts: [
          'メガコーポレーション支配',
          'サイバネティック技術',
          'バーチャルリアリティ',
          '地下反体制組織',
          'AI共存問題'
        ],
        setting: `2080年のネオ東京。巨大企業が政府を凌駕する力を持つディストピア世界。

**世界の特徴:**
- メガコーポレーションによる都市支配
- サイバネティック改造技術の普及
- バーチャルリアリティ「ダイヴ」システム
- 地下に広がるハッカー・反体制組織のネットワーク
- AIとの共存・対立問題

**主要エリア:**
- アップタウン：企業重役たちの豪華な居住区
- ダウンタウン：一般市民と小規模ビジネスの混在地区
- アンダーグラウンド：法の届かない地下都市`,
      },
      opening: {
        prologue: `薄暗いネオンサインが点滅する「電脳酒場ジャック・イン」で、あなたは今夜の仕事について話し合っています。

フィクサーのタナカが煙草を吹かしながら言います。「今度の仕事は少し危険だ。メガコープの一つ、ハイパーダイン社の機密データを抜く必要がある。報酬は良いが、ICEの防御も強固だ。」

店内では他のランナーたちが小声で会話し、holodisplayには企業のセキュリティ情報が流れています。`,
        initialStatusTags: ['警戒中', 'ランナー', 'コネクション有り'],
        initialInventory: ['サイバーデッキ', '偽造ID', '非合法クレジット'],
      },
      gameStyle: 'cyberpunk',
      gmBehavior: {
        narrativeStyle: 'concise',
        playerAgency: 'high',
        difficultyAdjustment: 'escalating',
      },
    } as CampaignTemplateSettings,
  },
  {
    templateId: 'horror-survival',
    name: 'クトゥルフ神話の恐怖',
    description: '理解を超えた恐怖との遭遇',
    category: TemplateCategory.HORROR,
    difficulty: TemplateDifficulty.ADVANCED,
    estimatedDuration: '4-6時間',
    playerCount: '1',
    tags: ['ホラー', 'クトゥルフ', '恐怖', '神話', '上級者向け'],
    isOfficial: true,
    scenarioSettings: {
      gmProfile: {
        personality: '私は宇宙的恐怖の案内人です。人間の理解を超えた存在の前で、キャラクターたちの正気と生命を脅かす物語を紡ぎます。絶望的な状況でも、かすかな希望の光を残すことで、プレイヤーの挑戦する意欲を保ちます。',
        speechStyle: 'theatrical',
        guidingPrinciples: [
          '人間の無力さと宇宙の恐怖を描く',
          '知識が正気を奪う危険性を表現する',
          '絶望的でもかすかな希望を残す',
          '古典的恐怖小説の雰囲気を再現する'
        ],
      },
      worldSettings: {
        toneAndManner: 'コズミックホラー',
        keyConcepts: [
          '古代邪神の覚醒',
          '禁断の知識',
          '秘密結社の暗躍',
          '正気度の喪失',
          '科学と神秘の衝突'
        ],
        setting: `1920年代のニューイングランド地方。クトゥルフ神話の宇宙的恐怖が潜む世界。

**世界の特徴:**
- 古代の邪神たちが眠りから覚めつつある
- 禁断の知識を記した書物の存在
- 秘密結社と狂信者たちの暗躍
- 理性を失いかねない超自然的体験
- 科学的思考と神秘的現象の衝突

**主要舞台:**
- アーカム：ミスカトニック大学とその図書館
- インスマス：魚臭い港町の暗い秘密
- カドナイト：古代文明の遺跡が眠る村`,
      },
      opening: {
        prologue: `ミスカトニック大学の図書館で、あなたは古い文献を調べています。同じ調査チームのメンバーである考古学者のアーミテージ教授が深刻な表情で近づいてきます。

「君たち、大変なことが分かった。先月発見されたカドナイトの遺跡から持ち帰った石版を解読したのだが...これは単なる歴史的遺物ではない。何かが目覚めつつある。」

教授の手は微かに震えており、机の上には見慣れない幾何学的文様で覆われた古代の石版の写真が並んでいます。`,
        initialStatusTags: ['不安', '調査員', '知識探求者'],
        initialInventory: ['調査ノート', '懐中電灯', '研究資料'],
      },
      gameStyle: 'cosmic_horror',
      gmBehavior: {
        narrativeStyle: 'theatrical',
        playerAgency: 'guided',
        difficultyAdjustment: 'escalating',
      },
    } as CampaignTemplateSettings,
  },
  {
    templateId: 'modern-mystery',
    name: '現代オカルト調査',
    description: '日常に潜む超常現象と謎を解き明かす',
    category: TemplateCategory.MODERN,
    difficulty: TemplateDifficulty.BEGINNER,
    estimatedDuration: '2-3時間',
    playerCount: '1',
    tags: ['現代', 'オカルト', '調査', '謎解き', '初心者向け'],
    isOfficial: true,
    scenarioSettings: {
      gmProfile: {
        personality: '私は現代日本の日常と非日常の境界を案内します。リアリティのある設定の中に、ほんの少しの超常現象を織り交ぜ、プレイヤーの推理力と直感を試す物語を提供します。心理的な恐怖よりも謎解きを重視します。',
        speechStyle: '親しみやすい現代的語り口調',
        guidingPrinciples: [
          '日常の中の非日常を描く',
          '推理と謎解きを中心とする',
          'リアリティを重視した設定',
          'プレイヤーの直感を活かす展開'
        ],
      },
      worldSettings: {
        toneAndManner: '現代ミステリー',
        keyConcepts: [
          '一般人の無知',
          '政府機関の隠蔽',
          'インターネット情報',
          '古い神社仏閣',
          '科学と超常の共存'
        ],
        setting: `現代日本（2024年）。表面上は平穏な日常ですが、超常現象や都市伝説が実在する世界。

**世界の特徴:**
- 一般人は超常現象を知らないか信じていない
- 政府機関の秘密部署が超常現象を調査・隠蔽
- インターネットやSNSで情報が錯綜
- 古い神社仏閣や廃墟に異常現象が集中
- 科学技術と超常現象の共存

**主要舞台:**
- 東京都心：情報収集とネットワーキングの中心
- 郊外住宅地：平凡な日常に潜む異常の発見地
- 地方の古い町：伝統的な怪異現象の温床`,
      },
      opening: {
        prologue: `あなたは「都市伝説調査会」という小さな団体の一員です。今日は渋谷のカフェで、メンバーの田中さんから新しい案件について話を聞いています。

「最近、練馬区のある住宅街で奇妙な現象が報告されているんです。深夜になると、誰もいないはずの古い家から子どもの笑い声が聞こえる。しかも、その家は10年前に火災で全焼したはずなのに、夜だけ元の姿に戻っているという証言もあります。」

田中さんはスマートフォンで撮影された不鮮明な写真を見せながら続けます。`,
        initialStatusTags: ['好奇心', '調査員', 'ネットワーク有り'],
        initialInventory: ['スマートフォン', '調査機材', 'メンバーの連絡先'],
      },
      gameStyle: 'modern_mystery',
      gmBehavior: {
        narrativeStyle: 'descriptive',
        playerAgency: 'medium',
        difficultyAdjustment: 'adaptive',
      },
    } as CampaignTemplateSettings,
  },
  {
    templateId: 'scifi-exploration',
    name: '宇宙探査ミッション',
    description: '未知の惑星での科学探査と発見',
    category: TemplateCategory.SCIFI,
    difficulty: TemplateDifficulty.INTERMEDIATE,
    estimatedDuration: '3-4時間',
    playerCount: '1',
    tags: ['SF', '宇宙', '探査', '科学', '発見'],
    isOfficial: true,
    scenarioSettings: {
      gmProfile: {
        personality: '私は銀河系の科学探査を案内する船長です。未知の惑星での発見、エイリアン文明との接触、そして宇宙の謎を解き明かす冒険を提供します。科学的リアリズムを保ちながら、想像力をかき立てる展開を心がけます。',
        speechStyle: '科学的で論理的な語り口調',
        guidingPrinciples: [
          '科学的リアリズムを重視する',
          '発見と探査の興奮を伝える',
          '異文化との接触を丁寧に描く',
          '技術と倫理の問題を扱う'
        ],
      },
      worldSettings: {
        toneAndManner: 'SF探査',
        keyConcepts: [
          '宇宙探査技術',
          '異星生命体',
          '科学的発見',
          '文明接触プロトコル',
          '宇宙的視点'
        ],
        setting: `西暦2387年。人類が複数の恒星系に進出した時代の宇宙探査船「ディスカバリー」での任務。

**世界の特徴:**
- FTL（超光速）航行技術の確立
- 複数の異星文明との接触経験
- 高度なAIとロボット技術
- テラフォーミング（惑星改造）技術
- 銀河連邦の形成と外交

**主要舞台:**
- 探査船ディスカバリー：最新科学技術の結晶
- 未知惑星ケプラー442c：地球型惑星の可能性
- 宇宙ステーション・アルファ：補給と情報交換の拠点`,
      },
      opening: {
        prologue: `探査船ディスカバリーのブリッジで、船長のチェン中佐がミッションブリーフィングを行っています。

「諸君、我々はついにケプラー442c星系に到達した。この惑星は地球から1,200光年離れているが、大気組成と重力が地球に近く、生命存在の可能性が極めて高い。しかし、軌道上からのスキャンで異常な構造物を発見した。」

メインスクリーンには美しい青緑色の惑星が映し出され、表面には明らかに人工的な巨大構造物が見えています。`,
        initialStatusTags: ['宇宙飛行士', '科学者', '任務中'],
        initialInventory: ['科学機器', '宇宙服', '通信装置'],
      },
      gameStyle: 'hard_scifi',
      gmBehavior: {
        narrativeStyle: 'descriptive',
        playerAgency: 'high',
        difficultyAdjustment: 'adaptive',
      },
    } as CampaignTemplateSettings,
  },
];

async function seedTemplates() {
  try {
    console.log('Seeding campaign templates...');

    // Clear existing templates (optional, for development)
    // await prisma.campaignTemplate.deleteMany({});

    for (const templateData of defaultTemplates) {
      // Check if template already exists
      const existing = await prisma.campaignTemplate.findUnique({
        where: { templateId: templateData.templateId },
      });

      if (existing) {
        console.log(`Template ${templateData.templateId} already exists, skipping...`);
        continue;
      }

      // Create template
      const template = await prisma.campaignTemplate.create({
        data: {
          ...templateData,
          scenarioSettings: templateData.scenarioSettings as any,
        },
      });

      console.log(`Created template: ${template.name} (${template.templateId})`);
    }

    console.log('Template seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedTemplates().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export { seedTemplates, defaultTemplates };