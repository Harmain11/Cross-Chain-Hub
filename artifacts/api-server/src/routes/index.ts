import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import forgeRouter from "./forge";
import teamsRouter from "./teams";
import apiKeysRouter from "./apiKeys";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(projectsRouter);
router.use(forgeRouter);
router.use(teamsRouter);
router.use(apiKeysRouter);

export default router;
