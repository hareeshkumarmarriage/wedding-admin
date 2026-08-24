import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getSiteSettings } from "@/lib/supabaseData";
import { youtubeEmbedUrl } from "@/lib/homepageMedia";

const BlogSection = () => {
  const [content, setContent] = useState<any>({});
  useEffect(() => { getSiteSettings().then((s) => setContent(s.wedding || {})).catch(() => {}); }, []);
  const posts = Array.isArray(content.blogs) && content.blogs.length ? [{ youtubeUrl: content.blogYoutubeUrl, title: content.blogTitle, author: content.blogAuthor, date: content.blogDate }, ...content.blogs] : [{ youtubeUrl: content.blogYoutubeUrl, title: content.blogTitle, author: content.blogAuthor, date: content.blogDate }];
  return <section className="py-20 md:py-28 bg-background">
    <div className="wedding-container">
      <div className="text-center mb-16">
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="section-subtitle mb-3">{content.blogEyebrow || "Latest News"}</motion.p>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="section-title">{content.blogHeading || "Our Latest Wedding News"}</motion.h2>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        {posts.map((post:any, index:number) => { const youtubeUrl = youtubeEmbedUrl(post.youtubeUrl || ""); return <motion.article key={`${post.title || "blog"}-${index}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="group w-full">
          <div className="relative w-full aspect-video overflow-hidden rounded-xl mb-4 shadow-md bg-black">
            {youtubeUrl ? <iframe className="absolute inset-0 w-full h-full" src={youtubeUrl} title={post.title || "Wedding YouTube video"} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <div className="grid h-full place-items-center text-white/70">Add a YouTube URL in Admin → Content.</div>}
          </div>
          <div className="flex items-center justify-center gap-3 mb-2"><span className="font-body text-xs text-muted-foreground">{post.author || "-"}</span><span className="w-1 h-1 rounded-full bg-primary" /><span className="font-body text-xs text-muted-foreground">{post.date || ""}</span></div>
          <h3 className="font-display text-lg text-foreground text-center group-hover:text-primary transition-colors">{post.title || "Wedding News"}</h3>
        </motion.article>; })}
      </div>
    </div>
  </section>;
};
export default BlogSection;
