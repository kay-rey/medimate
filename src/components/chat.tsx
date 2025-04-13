"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { medicalAiPromptSchema } from "@/lib/validation/schemas";
import axios from "axios";
import { useState } from "react";
import { Content } from "@google/genai";
import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Textarea } from "./ui/textarea";
import Loader from "./loader";
import { useUser } from '@auth0/nextjs-auth0';
import DisclaimerDialog from "./disclaimer-dialog";
import { AlertDialogTrigger } from "./ui/alert-dialog";

const markdownTheme = {
	p: "mb-4 leading-relaxed",
	h1: "text-2xl font-bold mb-4 ",
	h2: "text-xl font-semibold mb-3",
	h3: "text-lg font-medium mb-2",
	ul: "list-disc pl-6 mb-4 space-y-2", // Changed from list-inside
	ol: "list-decimal pl-6 mb-4 space-y-2", // Changed from list-inside
	li: "pl-2",
	code: "rounded px-1 py-0.5 font-mono text-sm",
	pre: "rounded p-4 mb-4 overflow-x-auto",
};

export function Chat() {
	const { user } = useUser();
	const [messages, setMessages] = useState<Content[]>([]);
	const [isAiLoading, setAiLoading] = useState<boolean>(false);

	const form = useForm<z.infer<typeof medicalAiPromptSchema>>({
		resolver: zodResolver(medicalAiPromptSchema),
		defaultValues: {
			question: "",
		},
	});

	const { submitCount, isSubmitting } = form.formState;

	async function onSubmit(values: z.infer<typeof medicalAiPromptSchema>) {
		// TODO: Error handling

		const userMessage: Content = {
			role: "user",
			parts: [{ text: values.question }],
		};

		let allMessages: Content[] = [...messages, userMessage];

		setMessages(allMessages);
		form.reset();
		setAiLoading(true);

		const response = await axios.post("/api/clarify", allMessages);

		await axios.post("/api/saved-responses", {
			userId: user?.sub,
			question: values.question,
			response: response.data
		  });

		const aiResponse: Content = {
			role: "model",
			parts: [{ text: response.data }],
		};

		allMessages = [...allMessages, aiResponse];

		setMessages(allMessages);

		setAiLoading(false);
	}

	return (
		<article className="space-y-10 p-2 sm:p-6 md:px-10">
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="mx-auto max-w-xl space-y-4"
				>
					<FormField
						control={form.control}
						name="question"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Input your medical statement or general
									medical clarifications
								</FormLabel>
								<FormControl>
									<Textarea
										placeholder="What is hypertension?"
										{...field}
										onKeyDown={(e) => {
											if (
												e.key === "Enter" &&
												!e.shiftKey
											) {
												e.preventDefault();
												form.handleSubmit(onSubmit)();
											}
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<DisclaimerDialog>
						{submitCount === 0 ? (
							<AlertDialogTrigger asChild>
								<Button
									type="submit"
									className="cursor-pointer"
									disabled={isSubmitting}
								>
									Ask
								</Button>
							</AlertDialogTrigger>
						) : (
							<Button
								type="submit"
								disabled={isSubmitting}
								className="cursor-pointer"
							>
								Ask
							</Button>
						)}
					</DisclaimerDialog>
				</form>
			</Form>
			<section className="mx-auto flex max-w-xl flex-col gap-y-6">
				{messages.map((message, index) => (
					<div
						key={index}
						className={cn(
							"overflow-auto rounded-md",
							message.role === "user"
								? "self-end bg-gray-100 p-4 dark:bg-gray-900"
								: "flex flex-col self-start",
						)}
					>
						<Markdown
							components={{
								p: ({ node, ...props }) => (
									<p className={markdownTheme.p} {...props} />
								),
								h1: ({ node, ...props }) => (
									<h1
										className={markdownTheme.h1}
										{...props}
									/>
								),
								h2: ({ node, ...props }) => (
									<h2
										className={markdownTheme.h2}
										{...props}
									/>
								),
								h3: ({ node, ...props }) => (
									<h3
										className={markdownTheme.h3}
										{...props}
									/>
								),
								ul: ({ node, ...props }) => (
									<ul
										className={markdownTheme.ul}
										{...props}
									/>
								),
								ol: ({ node, ...props }) => (
									<ol
										className={markdownTheme.ol}
										{...props}
									/>
								),
								li: ({ node, ...props }) => (
									<li
										className={markdownTheme.li}
										{...props}
									/>
								),
								code: ({ node, inline, ...props }) => (
									<code
										className={
											inline
												? markdownTheme.code
												: markdownTheme.pre
										}
										{...props}
									/>
								),
							}}
						>
							{message.parts && message.parts[0].text}
						</Markdown>
					</div>
				))}
				{isAiLoading && <Loader />}
			</section>
		</article>
	);
}
