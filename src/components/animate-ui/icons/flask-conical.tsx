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
        d={
          "M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"
        }
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M6.453 15h11.094"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M8.5 2h7"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}
export function FlaskConical(props: IconProps<never>) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
