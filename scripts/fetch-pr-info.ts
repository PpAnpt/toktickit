import fs from 'fs';

const headers = {
  'User-Agent': 'TokTickIT-Report-Bot/1.0',
  'Accept': 'application/vnd.github.v3+json'
};

async function fetchPR(prNumber: number) {
  const prRes = await fetch(`https://api.github.com/repos/PpAnpt/toktickit/pulls/${prNumber}`, { headers });
  if (!prRes.ok) {
    throw new Error(`PR status ${prRes.status}: ${await prRes.text()}`);
  }
  const prData = await prRes.json();

  const commentsRes = await fetch(`https://api.github.com/repos/PpAnpt/toktickit/issues/${prNumber}/comments`, { headers });
  const commentsData = commentsRes.ok ? await commentsRes.json() : [];

  const reviewsRes = await fetch(`https://api.github.com/repos/PpAnpt/toktickit/pulls/${prNumber}/reviews`, { headers });
  const reviewsData = reviewsRes.ok ? await reviewsRes.json() : [];

  return {
    prNumber,
    title: prData.title,
    body: prData.body,
    state: prData.state,
    merged_at: prData.merged_at,
    merged_by: prData.merged_by?.login,
    author: prData.user?.login,
    comments: Array.isArray(commentsData) ? commentsData.map((c: any) => ({
      user: c.user?.login,
      body: c.body,
      created_at: c.created_at
    })) : [],
    reviews: Array.isArray(reviewsData) ? reviewsData.map((r: any) => ({
      user: r.user?.login,
      body: r.body,
      state: r.state,
      submitted_at: r.submitted_at
    })) : []
  };
}

async function main() {
  const prs = [18, 19, 20, 21, 22, 23];
  const results = [];
  for (const num of prs) {
    try {
      console.log(`Fetching PR #${num}...`);
      const info = await fetchPR(num);
      console.log(`✅ Fetched PR #${num}: ${info.title} (Comments: ${info.comments.length}, Reviews: ${info.reviews.length})`);
      results.push(info);
    } catch (e: any) {
      console.error(`❌ Error PR #${num}:`, e.message);
    }
  }
  fs.writeFileSync('scripts/pr-details.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('Saved to scripts/pr-details.json');
}

main();
