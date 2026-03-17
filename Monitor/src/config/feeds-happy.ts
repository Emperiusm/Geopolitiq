import type { Feed } from '@/types';
import { rssProxyUrl } from '@/utils';

const rss = rssProxyUrl;

export const HAPPY_FEEDS: Record<string, Feed[]> = {
  positive: [
    { name: 'Good News Network', url: rss('https://www.goodnewsnetwork.org/feed/') },
    { name: 'Positive.News', url: rss('https://www.positive.news/feed/') },
    { name: 'Reasons to be Cheerful', url: rss('https://reasonstobecheerful.world/feed/') },
    { name: 'Optimist Daily', url: rss('https://www.optimistdaily.com/feed/') },
    { name: 'Upworthy', url: rss('https://www.upworthy.com/feed/') },
    { name: 'DailyGood', url: rss('https://www.dailygood.org/feed') },
    { name: 'Good Good Good', url: rss('https://www.goodgoodgood.co/articles/rss.xml') },
    { name: 'GOOD Magazine', url: rss('https://www.good.is/feed/') },
    { name: 'Sunny Skyz', url: rss('https://www.sunnyskyz.com/rss_tebow.php') },
    { name: 'The Better India', url: rss('https://thebetterindia.com/feed/') },
  ],
  science: [
    { name: 'GNN Science', url: rss('https://www.goodnewsnetwork.org/category/news/science/feed/') },
    { name: 'ScienceDaily', url: rss('https://www.sciencedaily.com/rss/all.xml') },
    { name: 'Nature News', url: rss('https://feeds.nature.com/nature/rss/current') },
    { name: 'Live Science', url: rss('https://www.livescience.com/feeds.xml') },
    { name: 'New Scientist', url: rss('https://www.newscientist.com/feed/home/') },
    { name: 'Singularity Hub', url: rss('https://singularityhub.com/feed/') },
    { name: 'Human Progress', url: rss('https://humanprogress.org/feed/') },
    { name: 'Greater Good (Berkeley)', url: rss('https://greatergood.berkeley.edu/site/rss/articles') },
  ],
  nature: [
    { name: 'GNN Animals', url: rss('https://www.goodnewsnetwork.org/category/news/animals/feed/') },
    { name: 'GNN Earth', url: rss('https://www.goodnewsnetwork.org/category/news/earth/feed/') },
    { name: 'Mongabay', url: rss('https://news.mongabay.com/feed/') },
    { name: 'Conservation Optimism', url: rss('https://conservationoptimism.org/feed/') },
  ],
  health: [
    { name: 'GNN Health', url: rss('https://www.goodnewsnetwork.org/category/news/health/feed/') },
  ],
  inspiring: [
    { name: 'GNN Heroes', url: rss('https://www.goodnewsnetwork.org/category/news/inspiring/feed/') },
    { name: 'GNN Heroes Spotlight', url: rss('https://www.goodnewsnetwork.org/category/news/heroes/feed/') },
  ],
  community: [
    { name: 'Shareable', url: rss('https://www.shareable.net/feed/') },
    { name: 'Yes! Magazine', url: rss('https://www.yesmagazine.org/feed') },
  ],
};
