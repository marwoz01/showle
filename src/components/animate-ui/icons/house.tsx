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
        d={"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={
          "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        }
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}
export function House(props: IconProps<never>) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
