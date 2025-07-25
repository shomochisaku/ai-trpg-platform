import { CampaignPreset } from '../types';

export const campaignPresets: CampaignPreset[] = [
  {
    id: 'fantasy',
    title: '剣と魔法のファンタジー',
    description: '中世ファンタジー世界での冒険',
    formData: {
      title: 'ファンタジー冒険',
      description: '剣と魔法が息づく世界での英雄的な冒険',
      scenarioSettings: {
        gmPersonality: '私は古き良きファンタジー世界の語り部です。プレイヤーの勇敢な行動を称賛し、魔法と剣技が織りなす壮大な物語を紡ぎます。困難な状況でも希望を失わず、仲間との絆を大切にする物語を描きます。',
        worldSetting: `中世ファンタジーの世界「アルテミア大陸」を舞台とします。

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
        storyIntroduction: `冒険者ギルド「蒼き星亭」の重厚な扉を開けると、様々な種族の冒険者たちの活気ある声が聞こえてきます。

受付嬢のエリナが微笑みかけ、「お疲れ様です、冒険者様。今日も新しい依頼が届いています。どちらになさいますか？」と声をかけます。

壁には数多くの依頼書が貼られており、その中には普通の配達依頼から、古代遺跡の調査、魔物討伐まで様々な冒険が待っています。`,
        gameStyle: 'classic_fantasy',
        gmBehavior: {
          narrativeStyle: 'descriptive',
          playerAgency: 'high',
          difficultyAdjustment: 'adaptive'
        }
      }
    }
  },
  {
    id: 'cyberpunk',
    title: 'サイバーパンク2080',
    description: '近未来のサイバーパンク世界での活動',
    formData: {
      title: 'サイバーパンク作戦',
      description: '企業支配の近未来都市での反体制活動',
      scenarioSettings: {
        gmPersonality: '私はネオ東京の闇を知るガイドです。企業の陰謀、サイバネティック技術の光と影、そして人間性を問う物語を提供します。クールで現実的な語り口で、プレイヤーの選択が世界に与える影響を重視します。',
        worldSetting: `2080年のネオ東京。巨大企業が政府を凌駕する力を持つディストピア世界。

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
        storyIntroduction: `薄暗いネオンサインが点滅する「電脳酒場ジャック・イン」で、あなたは今夜の仕事について話し合っています。

フィクサーのタナカが煙草を吹かしながら言います。「今度の仕事は少し危険だ。メガコープの一つ、ハイパーダイン社の機密データを抜く必要がある。報酬は良いが、ICEの防御も強固だ。」

店内では他のランナーたちが小声で会話し、holodisplayには企業のセキュリティ情報が流れています。`,
        gameStyle: 'cyberpunk',
        gmBehavior: {
          narrativeStyle: 'concise',
          playerAgency: 'high',
          difficultyAdjustment: 'escalating'
        }
      }
    }
  },
  {
    id: 'modern',
    title: '現代オカルト調査',
    description: '現代日本を舞台とした超常現象の調査',
    formData: {
      title: '現代ミステリー',
      description: '日常に潜む超常現象と謎を解き明かす',
      scenarioSettings: {
        gmPersonality: '私は現代日本の日常と非日常の境界を案内します。リアリティのある設定の中に、ほんの少しの超常現象を織り交ぜ、プレイヤーの推理力と直感を試す物語を提供します。心理的な恐怖よりも謎解きを重視します。',
        worldSetting: `現代日本（2024年）。表面上は平穏な日常ですが、超常現象や都市伝説が実在する世界。

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
        storyIntroduction: `あなたは「都市伝説調査会」という小さな団体の一員です。今日は渋谷のカフェで、メンバーの田中さんから新しい案件について話を聞いています。

「最近、練馬区のある住宅街で奇妙な現象が報告されているんです。深夜になると、誰もいないはずの古い家から子どもの笑い声が聞こえる。しかも、その家は10年前に火災で全焼したはずなのに、夜だけ元の姿に戻っているという証言もあります。」

田中さんはスマートフォンで撮影された不鮮明な写真を見せながら続けます。`,
        gameStyle: 'modern_mystery',
        gmBehavior: {
          narrativeStyle: 'descriptive',
          playerAgency: 'medium',
          difficultyAdjustment: 'adaptive'
        }
      }
    }
  },
  {
    id: 'horror',
    title: 'クトゥルフ神話の恐怖',
    description: 'コズミックホラーの世界での生存',
    formData: {
      title: 'クトゥルフ調査',
      description: '理解を超えた恐怖との遭遇',
      scenarioSettings: {
        gmPersonality: '私は宇宙的恐怖の案内人です。人間の理解を超えた存在の前で、キャラクターたちの正気と生命を脅かす物語を紡ぎます。絶望的な状況でも、かすかな希望の光を残すことで、プレイヤーの挑戦する意欲を保ちます。',
        worldSetting: `1920年代のニューイングランド地方。クトゥルフ神話の宇宙的恐怖が潜む世界。

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
        storyIntroduction: `ミスカトニック大学の図書館で、あなたは古い文献を調べています。同じ調査チームのメンバーである考古学者のアーミテージ教授が深刻な表情で近づいてきます。

「君たち、大変なことが分かった。先月発見されたカドナイトの遺跡から持ち帰った石版を解読したのだが...これは単なる歴史的遺物ではない。何かが目覚めつつある。」

教授の手は微かに震えており、机の上には見慣れない幾何学的文様で覆われた古代の石版の写真が並んでいます。`,
        gameStyle: 'cosmic_horror',
        gmBehavior: {
          narrativeStyle: 'theatrical',
          playerAgency: 'guided',
          difficultyAdjustment: 'escalating'
        }
      }
    }
  }
];

export const getPresetById = (id: string): CampaignPreset | undefined => {
  return campaignPresets.find(preset => preset.id === id);
};