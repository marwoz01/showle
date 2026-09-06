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
      <motion.polyline
        points={"14.5 17.5 3 6 3 3 6 3 17.5 14.5"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={"13"}
        x2={"19"}
        y1={"19"}
        y2={"13"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={"16"}
        x2={"20"}
        y1={"16"}
        y2={"20"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={"19"}
        x2={"21"}
        y1={"21"}
        y2={"19"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.polyline
        points={"14.5 6.5 18 3 21 3 21 6 17.5 9.5"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={"5"}
        x2={"9"}
        y1={"14"}
        y2={"18"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={"7"}
        x2={"4"}
        y1={"17"}
        y2={"20"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={"3"}
        x2={"5"}
        y1={"19"}
        y2={"21"}
        variants={variants.shape}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}
export function Swords(props: IconProps<never>) {
  return <IconWrapper icon={IconComponent} {...props} />;
}
