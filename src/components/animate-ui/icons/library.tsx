"use client";
// Lucide SVG (ISC), animated through Animate UI. See ../LUCIDE-LICENSE.txt.
import { motion } from "motion/react";
import {
  IconWrapper,
  staticAnimations,
  getVariants,
  useAnimateIconContext,
  type IconProps,
} from "./icon";
const animations = { default: { shape: staticAnimations.path } };
function IconComponent({ size, ...props }: IconProps<never>) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d={"m16 6 4 14"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M12 6v14"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M8 8v12"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M4 4v16"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}
export function Library(props: IconProps<never>) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
