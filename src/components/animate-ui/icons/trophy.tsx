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
        d={"M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M18 9h1.5a1 1 0 0 0 0-5H18"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M4 22h16"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M6 9H4.5a1 1 0 0 1 0-5H6"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}
export function Trophy(props: IconProps<never>) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
