const prisma = require("../lib/prisma");

async function isOwner(req, res, next) {
    const id = Number(req.params.quizId);
    const post = await prisma.post.findUnique({
        where: { id },
        include: {keywords}
    });

    if (!post) {
        throw new NotFoundError("Post not found");
    }

    if (post.userId !== req.user.userId) {
        throw new ForbiddenError("You can only modify your own posts");
    }

    req.post = post;
    next();
}
module.exports = isOwner;