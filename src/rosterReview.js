// Explicit reviewed aliases only. Similar names, different people and the
// Greek/Roman counterparts of deities are not automatically merged.
export const personAliases = {
  '王守仁':'王阳明','孟轲':'孟子','孙武':'孙子','列御寇':'列子',
  '禹':'大禹','许由尧时':'许由','姜太公':'吕尚','延陵季子':'季札',
  '大迦旃延':'迦旃延','摩诃迦旃延':'迦旃延','世亲菩萨':'世亲',
  '弘一法师':'李叔同','汉钟离':'钟离权','陈抟老祖':'陈抟',
  '鬼谷先生':'鬼谷子','徐市':'徐福','许旌阳':'许逊','许真君':'许逊',
  '张果':'张果老','尹喜':'关尹',
  '铁拐李李玄':'铁拐李','曹国舅曹景休':'曹国舅','韩湘子韩湘':'韩湘子',
  '何仙姑何琼':'何仙姑','张紫阳':'张伯端','端木赐':'子贡',
  '颜渊':'颜回','曾点':'曾皙','淮南王刘安':'刘安',
  '马可奥勒留':'马可·奥勒留','伊本鲁世':'阿维罗伊','伊本西那':'伊本·西那',
  '圣雄甘地':'甘地','德兰修女':'特蕾莎修女','戴安娜':'狄安娜',
  '约翰加尔文':'加尔文','丹麦克尔凯郭尔':'克尔凯郭尔',
  '方济各沙勿略':'沙勿略','大安东尼':'安东尼',
};

const additions = {
  中国: [
    ['贾谊','政论家 · 文学家'],['荀攸','曹魏谋士'],['庞统','东汉末年谋士'],
    ['徐庶','东汉末年谋士'],['法正','蜀汉谋士'],['鲁肃','东吴谋士'],
    ['吕蒙','东吴军事家'],['陆抗','东吴军事家'],['姜维','蜀汉军事家'],
    ['邓艾','曹魏军事家'],['钟会','曹魏军事家'],['魏延','蜀汉军事家'],
    ['司马昭','曹魏政治家'],['司马师','曹魏政治家'],['陈寿','历史学家'],
    ['裴松之','历史学家'],['刘勰','文学理论家'],['钟嵘','文学批评家'],
    ['刘知几','历史学家'],['李纲','宋代政治家'],['海瑞','明代政治家'],
    ['戚继光','明代军事家'],['郑成功','明清之际军事家'],['张居正','明代政治家'],
    ['王廷相','哲学家'],['顾宪成','思想家'],['高攀龙','思想家'],
    ['颜元','教育家 · 思想家'],['李塨','思想家'],['王念孙','语言学家'],
    ['王引之','语言学家'],['俞樾','经学家'],['孙诒让','经学家'],
    ['黄侃','语言学家'],['刘师培','学者'],
  ],
  国外: [
    ['莎士比亚','剧作家 · 诗人'],['歌德','作家 · 思想家'],
    ['曼德拉','政治家 · 和解倡导者'],['马丁·路德·金','民权运动领袖'],
    ['图灵','数学家 · 计算机科学先驱'],['冯·诺依曼','数学家'],
    ['霍金','物理学家'],['玻尔','物理学家'],['普朗克','物理学家'],
    ['薛定谔','物理学家'],['海森堡','物理学家'],['巴斯德','生物学家'],
    ['孟德尔','遗传学先驱'],['南丁格尔','护理学先驱'],
  ],
};

export const aliasPersonIds = new Map();
export const rosterReview = [];
export function reviewRoster(roster) {
  const byName = new Map(roster.map(person => [person.name, person]));
  const used = new Set(byName.keys());
  return roster.map(person => {
    const canonical = personAliases[person.name];
    if (!canonical || !byName.has(canonical)) return person;
    const addition = additions[person.region].find(([name]) => !used.has(name) && !personAliases[name]);
    if (!addition) throw new Error(`人物补充池不足：${person.region}`);
    const [name, role] = addition;
    used.add(name);
    aliasPersonIds.set(person.id, byName.get(canonical).id);
    rosterReview.push({ removed: person.name, canonical, added: name });
    return {
      ...person, id: `reviewed-${name}`, name, role,
      era:'历史人物', summary:`${name}是${role}，可以围绕其生平、贡献及时代背景展开对话。`,
      quote:'', source:'', prompts:['你的主要贡献是什么？','你如何面对时代的挑战？','你的经历对今天有什么启发？'],
    };
  });
}
