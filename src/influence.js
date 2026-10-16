// Editorial estimates, not live popularity data or an objective historical ranking.
// Each dimension is 0–100: public familiarity 35%, contribution 35%, ideas 30%.
const profiles = [
  [100,100,100,'孔子'],
  [99.9,100,100,'老子'],
  [99.8,100,100,'毛主席 毛泽东'],
  [99,99,99,'释迦牟尼 佛陀 耶稣 苏格拉底 柏拉图 亚里士多德 马克思'],
  [98,98,96,'孟子 孟轲 庄子 康德 笛卡尔 牛顿 爱因斯坦 穆罕默德 达尔文'],
  [96,95,94,'荀子 墨子 韩非 孙子 王阳明 王守仁 朱熹 莎士比亚 黑格尔 卢梭 洛克 尼采 弗洛伊德 亚当·斯密'],
  [96,94,87,'苏轼 李白 杜甫 鲁迅 诸葛亮 曹操 秦始皇 汉武帝 唐太宗 孙中山 邓小平 拿破仑 华盛顿 林肯 甘地 曼德拉'],
  [91,93,94,'董仲舒 张载 程颢 程颐 王夫之 黄宗羲 顾炎武 司马迁 王安石 韩愈 柳宗元 伏尔泰 斯宾诺莎 莱布尼茨 叔本华 罗素 维特根斯坦 萨特 海德格尔 达·芬奇 列奥纳多·达·芬奇'],
  [93,88,85,'范仲淹 陶渊明 辛弃疾 文天祥 岳飞 屈原 曾国藩 林则徐 梁启超 蔡元培 玄奘 慧能 张三丰 关羽 刘备 孙权 贾诩 荀彧 郭嘉 司马懿 张良 萧何 韩信 商鞅 管仲 范蠡'],
  [91,88,82,'黄帝 女娲 伏羲 神农 尧 舜 禹 大禹 盘古 西王母 观音 地藏菩萨 妈祖 宙斯 雅典娜 阿波罗 奥丁 托尔 湿婆 毗湿奴 梵天'],
  [86,89,90,'周敦颐 陆九渊 程朱理学 王艮 王畿 戴震 钱穆 熊十力 冯友兰 牟宗三 陈独秀 李大钊 胡适 严复 章太炎 康有为 曾参 子思 墨翟 韩非子 王充 王弼 嵇康 阮籍 龙树 世亲 菩提达摩 智顗 鸠摩罗什'],
  [86,88,86,'欧阳修 司马光 苏辙 苏洵 黄庭坚 李清照 白居易 刘禹锡 杜牧 王维 王羲之 颜真卿 王重阳 丘处机 葛洪 张道陵 孙思邈 张仲景 华佗 李时珍 张衡 祖冲之 沈括 宋应星 徐光启 郑和'],
  [87,90,90,'毕达哥拉斯 赫拉克利特 伊壁鸠鲁 塞涅卡 奥古斯丁 阿奎那 培根 蒙田 马基雅维利 帕斯卡 但丁 托尔斯泰 陀思妥耶夫斯基 泰戈尔 荣格 波伏娃 汉娜·阿伦特 福柯 加缪 鲁米 阿育王 阿维罗伊 伊本·西那'],
];
const curated = new Map(profiles.flatMap(([popularity, contribution, thought, names]) =>
  names.split(' ').map(name => [name, { popularity, contribution, thought }])));

export function influenceDimensions(person) {
  if (curated.has(person.name)) return curated.get(person.name);
  // Less-documented entries receive conservative role-based estimates. No name
  // hash, random factor, roster position or image availability affects the score.
  const role = person.role || '';
  let popularity = 45, contribution = 50, thought = 48;
  if (/哲学|思想|诸子|经学/.test(role)) { contribution += 12; thought += 22; }
  if (/宗教|佛学|修行|神学/.test(role)) { popularity += 5; contribution += 9; thought += 15; }
  if (/科学|数学|医学|医药|教育|学术/.test(role)) { contribution += 20; thought += 8; }
  if (/文学|诗人|作家|艺术/.test(role)) { popularity += 12; contribution += 12; thought += 8; }
  if (/政治|治世|制度|君主|军事|谋士/.test(role)) { popularity += 10; contribution += 14; }
  if (/神话|神祇|传说|文化英雄/.test(role)) { popularity += 15; contribution += 7; }
  if (/创始|奠基|先驱|开创/.test(role)) { contribution += 8; thought += 5; }
  return { popularity: Math.min(popularity, 100), contribution: Math.min(contribution, 100), thought: Math.min(thought, 100) };
}

export function influenceScore(person) {
  const { popularity, contribution, thought } = influenceDimensions(person);
  return Math.round((popularity * .35 + contribution * .35 + thought * .3) * 100) / 100;
}

// Product curation sits above estimated scores: fixed featured slots and at
// most six consecutive non-China entries. Apply before filtering search names.
export function rankDialoguePeople(people) {
  const remaining = [...people].sort((a, b) => influenceScore(b) - influenceScore(a) || a.name.localeCompare(b.name, 'zh-CN'));
  const featured = new Map([[0, '孔子'], [1, '老子'], [2, '毛主席'], [8, '王阳明']]);
  const reserved = new Set(featured.values());
  const result = [];
  let foreignRun = 0;
  let chinaCount = remaining.filter(person => person.region === '中国').length;
  let worldCount = remaining.length - chinaCount;
  while (remaining.length) {
    const pinned = featured.get(result.length);
    let index = pinned ? remaining.findIndex(person => person.name === pinned) : -1;
    if (index < 0) {
      index = remaining.findIndex(person => !reserved.has(person.name));
      if (index < 0) index = 0;
      if (foreignRun >= 6 && chinaCount) {
        const nextChina = remaining.findIndex(person => person.region === '中国' && !reserved.has(person.name));
        if (nextChina >= 0) index = nextChina;
      } else if (remaining[index].region === '中国' && worldCount && chinaCount <= Math.ceil(worldCount / 6)) {
        // Save enough China entries to break up the tail of the entire roster.
        const nextWorld = remaining.findIndex(person => person.region !== '中国');
        if (nextWorld >= 0) index = nextWorld;
      }
    }
    const [person] = remaining.splice(index, 1);
    result.push(person);
    reserved.delete(person.name);
    if (person.region === '中国') { chinaCount--; foreignRun = 0; }
    else { worldCount--; foreignRun++; }
  }
  return result;
}
