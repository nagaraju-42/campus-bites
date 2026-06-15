# Top 50 Interview Questions for DineNDeliver

Based on the architecture of DineNDeliver, here are the top 50 realistic, challenging questions an interviewer might ask you. They are broken down into the exact categories companies test for when hiring Full Stack or Frontend Engineers.

---

## Part 1: Next.js & React Frontend (1-10)
*These test your modern React knowledge and why you chose the App Router.*

1. **Why Next.js?** Why did you choose Next.js App Router for this project instead of a standard React SPA (Single Page Application) like Vite?
2. **SSR vs CSR:** Which parts of your application are Server-Side Rendered (SSR) and which are Client-Side Rendered (CSR)? Why did you make those choices?
3. **State Management:** You have a lot of complex state (cart data, user auth, shop UI). How did you manage global state across the app without prop drilling?
4. **Data Fetching:** Next.js heavily promotes Server Components. Did you use Server Actions for mutations? If so, what is the benefit over standard API routes?
5. **Hydration Errors:** Did you encounter any React Hydration errors during development? What causes them, and how do you fix them?
6. **Optimistic Updates:** When a rider accepts an order, does the UI wait for the database response to update, or do you use optimistic UI updates? How would you implement that?
7. **Performance Optimization:** Your platform has a lot of images (shop logos, food items). How did you optimize these images so they don't block the main thread and slow down the Largest Contentful Paint (LCP)?
8. **Suspense & Boundaries:** How did you handle loading states? Did you use React Suspense or `loading.tsx` files to stream content to the user?
9. **Hooks:** Explain a scenario in your app where you had to use `useEffect` and how you ensured it didn't cause an infinite re-render loop.
10. **Reusability:** You have many user types (Student, Admin, Shop). Did you build shared UI components (like Tables or Modals), and how did you make them flexible enough for different contexts?

---

## Part 2: Supabase & PostgreSQL (11-20)
*These test your database design, real-time knowledge, and SQL skills.*

11. **Why Supabase?** Why did you choose Supabase over Firebase or a custom Node/Express backend with MongoDB?
12. **Relational Data Modeling:** Can you explain the relationship between a `Shop`, a `Category`, a `Menu Item`, and an `Order`? How are your foreign keys structured?
13. **Real-time WebSockets:** DineNDeliver uses real-time updates for order tracking. Explain how Supabase real-time subscriptions work under the hood. Does it poll the database, or is it push-based?
14. **Database Triggers:** Did you use any PostgreSQL triggers or functions? (For example, auto-updating an `updated_at` column or calculating best-sellers).
15. **Query Optimization:** If your app scales to 10,000 shops and millions of menu items, how would you ensure the "Search items" query remains fast? (Hint: Indexes, pg_trgm).
16. **Transactions:** When a student places an order, you might need to insert into `orders` and update an inventory count simultaneously. How do you ensure both succeed or both fail?
17. **Data Fetching Performance:** Tell me about the N+1 query problem. How did you avoid it when fetching a list of Orders and their associated Shop and Student details?
18. **Migrations:** How did you handle changes to your database schema as the project evolved? 
19. **Connection Pooling:** If 5,000 students log on at noon to order lunch, how does Supabase handle the massive spike in database connections?
20. **Soft Deletes:** I noticed an `is_archived` column on menu items. Why did you choose to "soft delete" items instead of running a SQL `DELETE` command?

---

## Part 3: Architecture & Progressive Web Apps (PWA) (21-30)
*These test your understanding of distributed systems, offline support, and system design.*

21. **Multi-Tenant Architecture:** Your app serves multiple different user portals. How did you structure the Next.js routing to handle completely different layouts and logic for Shops vs. Students vs. Riders?
22. **The Service Worker:** Explain what a Service Worker is. What lifecycle events does it go through?
23. **Caching Strategies (The "Bug" Question):** You used `NetworkFirst` for pages and `CacheFirst` for images. Why? What happens when you update an image on the server but the client has it cached? How did you solve this?
24. **Offline Capability:** If a student is in a dead zone on campus and opens the app, what exactly do they see? How does the PWA handle this?
25. **Push Notifications:** How would you architect a system to send a push notification to a Rider's phone when a new order is ready for pickup?
26. **Monolith vs Microservices:** Your app is currently a monolith (Next.js handles both frontend and backend logic via server actions/API). At what point would you consider breaking the backend into microservices?
27. **Event-Driven Architecture:** When an order is placed, several things need to happen (notify shop, notify rider, send email). How do you handle this so the user isn't waiting 5 seconds for the "Order Placed" screen to load?
28. **Scalability Bottlenecks:** Look at your architecture right now. If your app went viral tomorrow, what is the very first thing that would crash?
29. **Deployment:** Walk me through your CI/CD pipeline. What happens between pushing code to GitHub and the user seeing the update on Vercel?
30. **App Shell Model:** Does your PWA utilize the App Shell model? How does it improve perceived performance?

---

## Part 4: Security, Authentication & RLS (31-40)
*These test your ability to build secure, production-ready systems.*

31. **JWT Authentication:** How does Supabase/GoTrue authentication actually work? Where is the JWT stored on the client, and why is that secure?
32. **Row Level Security (RLS) Basics:** Explain Row Level Security to me like I am a junior developer. Why is it better than application-layer filtering?
33. **Complex RLS Policies:** Walk me through the exact SQL/logic required to write a policy that says: *"A Shop Owner can only update orders that belong to their specific shop_id."*
34. **Role-Based Access Control (RBAC):** You have Super Admins, Shop Owners, Riders, and Students. Where are these roles defined in your database, and how do you ensure a Student cannot upgrade themselves to an Admin?
35. **Cross-Site Scripting (XSS):** If a malicious Shop Owner inputs `<script>alert('hack')</script>` as their Shop Name, how does Next.js prevent this from executing on the Student's screen?
36. **CSRF Attacks:** Since you use Server Actions and cookies for auth, how are you protecting against Cross-Site Request Forgery?
37. **Rate Limiting:** How would you prevent a malicious user from spamming your "Place Order" API endpoint 1,000 times a second?
38. **API Keys vs Service Roles:** What is the difference between the Supabase `anon_key` and the `service_role_key`? When is it appropriate to use the service role key?
39. **Data Privacy:** A student requests to delete their account. Because of foreign key constraints, deleting their user row might break historical order data. How do you handle this?
40. **Bypassing RLS:** In your `adminMenu.ts` server action, you import menu items. How does that server action bypass RLS to insert items for any shop, and why is that secure?

---

## Part 5: Behavioral & Product Engineering (41-50)
*These test your problem-solving, product mindset, and how you work as an engineer.*

41. **The Hardest Bug:** Tell me about the most difficult, tear-your-hair-out bug you faced while building DineNDeliver. How did you eventually solve it?
42. **Technical Debt:** Is there a piece of code in DineNDeliver that you are not proud of? If you had an extra week to refactor it, what would you change?
43. **Product Decisions:** Why did you choose to build a web-based PWA instead of native iOS and Android apps using React Native?
44. **Handling Failure:** Have you ever pushed code to production that broke a core feature? How did you handle the rollback and post-mortem?
45. **Build vs Buy:** You chose to use Supabase instead of building auth and DB from scratch. How do you evaluate when to build a feature yourself versus paying a 3rd party service to handle it?
46. **User Experience (UX):** Give me an example of a specific UX decision you made to reduce friction for the user (e.g., auto-focusing inputs, saving cart state).
47. **Learning New Tech:** You used a lot of modern tools (App Router, Turbopack, Supabase). How do you approach learning a new technology when the documentation is sparse or outdated?
48. **Conflict Resolution:** Imagine a scenario where the product manager wants to launch a feature tomorrow, but you know the code is messy and needs refactoring. How do you handle that conversation?
49. **AI in Development:** How did you use AI (Copilot, Claude) to build this project? How do you ensure you aren't just copying code you don't understand?
50. **Future Vision:** If you received $1 Million in seed funding for DineNDeliver today, what are the first three engineering hires you would make, and what would they build?
