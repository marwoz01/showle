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
          "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
        }
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M12 9v4"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d={"M12 17h.01"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}
export function TriangleAlert(props: IconProps<never>) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
