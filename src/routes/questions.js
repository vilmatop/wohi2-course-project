  const express = require("express");
  const router = express.Router();
  const prisma = require("../lib/prisma");
  const authenticate = require("../middleware/auth");
  const isOwner = require("../middleware/isOwner");
  const multer = require("multer");
  const path = require("path");
  const { NotFoundError } = require("../lib/errors");
  const {z} = require("zod");

  const PostInput = z.object({
    title: z.string().min(1),
    date: z.string(),
    content: z.string().min(1),
    keywords: z.union([z.string(), z.array(z.string())]).optional(),
  });

  const storage = multer.diskStorage({
    destination: path.join(__dirname, "..","..","public","uploads"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const newName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
      cb(null, newName);
    }
  })

  const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
      if ( file.mimetype.startsWith("image/") ) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
    })
  //const questions = require("../data/quiz");

  function formatPost(post) {
    return {
      ...post,
      date: post.date instanceof Date ? post.date.toISOString().split("T")[0] : post.date,
      keywords: (post.keywords || []).map((k) => k.name),
      userName: post.user?.name || null,
      liked: post.likes && post.likes.length > 0,
      likeCount: post._count.likes ?? 0,
      user: undefined,
      _count: undefined,
      likes: undefined, 
    };
  }

  router.use(authenticate);

  // GET /api/posts, /api/posts?keyword=http&oage=1&limit=5
  router.get("/", async (req, res) => {
    const { keyword} = req.query;

    const where = keyword ?
    { keywords: { some: { name: keyword } } } : {};

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
      const skip = (page - 1) * limit;

      const [filteredPosts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          include: { 
            keywords: true, 
            user: true ,
            likes: {where: { userId: req.user.userId}, take: 1},
            _count: { select: { likes: true } }
          },
          orderBy: { id: "asc" },
          skip,
          take: limit
        }), prisma.post.count({ where })]);

    res.json({
      data: filteredPosts.map(formatPost),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit), 
    })
  });



  // GET /api/posts/:postId 
  router.get("/:quizId", async (req, res) => {
    const quizId = Number(req.params.quizId);
    const post = await prisma.post.findUnique({
      where: { id: quizId },
      include: { keywords: true, user: true },
    });

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    res.json(formatPost(post));
  });



  // POST /api/posts
  router.post("/", upload.single("image"), async (req, res) => {
    const { title, date, content, keywords } = PostInput.parse(req.body);

    const keywordsArray = Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const newPost = await prisma.post.create({
      data: {
        title,
        date: new Date(date),
        content,
        imageUrl,
        userId: req.user.userId,
        keywords: {
          connectOrCreate: keywordsArray.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
      include: {
        keywords: true,
        user: true,
        likes: { where: { userId: req.user.userId }, take: 1 },
        _count: { select: { likes: true } },
      },
    });

    res.status(201).json(formatPost(newPost));
  });



  // PUT /api/posts/:postId
  router.put("/:postId", isOwner, upload.single("image"), async (req, res) => {
    const postId = Number(req.params.postId);
    const { title, date, content, keywords } = req.body;
    const existingPost = await prisma.post.findUnique({ 
      where: { id: postId },
      include: { keywords: true, user: true }
    });
    if (!existingPost) {
      throw new NotFoundError("Post not found");
    }

    if (!title || !date || !content) {
      throw new Error("title, date and content are mandatory");
    }
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title, date: new Date(date), content, imageUrl,
        keywords: {
          set: [],
          connectOrCreate: keywordsArray.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
      include: {
        keywords: true,
        user: true,
        likes: { where: { userId: req.user.userId }, take: 1 },
        _count: { select: { likes: true } },
      },
    });
    res.json(formatPost(updatedPost));
  });





  // DELETE /api/posts/:postId
  router.delete("/:postId", isOwner, async (req, res) => {
    const postId = Number(req.params.postId);
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { keywords: true, user: true },
    });

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    await prisma.post.delete({ where: { id: postId } });

    res.json({
      message: "Post deleted successfully",
      post: formatPost(post),
    });
  })

  //POST /api/posts/:postId/like
  router.post("/:postId/like", async (req, res) => {
    const postId = Number(req.params.postId);
    const post = await prisma.post.findUnique({where: { id: postId }});
    if(!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const like = await prisma.like.upsert({
      where: { userId_postId: { userId: req.user.userId, postId } },
      update: {},
      create: { userId: req.user.userId, postId },
    });

    const likeCount = await prisma.like.count({ where: { postId }});

    res.status(201).json({
      id: like.id,
      postId,
      liked: true,
      likeCount,
      createdAt: like.createdAt,
      });
  });

  //DELETE /api/posts/:postId/like
  router.delete("/:postId/like", async (req, res) => {
    const postId = Number(req.params.postId);
    const post = await prisma.post.findUnique({where: { id: postId }});
    if(!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const like = await prisma.like.deleteMany({
      where: { userId: req.user.userId, postId },
    });

    const likeCount = await prisma.like.count({ where: { postId }});

    res.json({
      postId,
      liked: false,
      likeCount,
      });
  });






  module.exports = router;