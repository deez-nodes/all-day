# Premise
The difficulty in starting at a new restaurant is learning what the dishes are and what order to make them. It's also an adjustment getting used to reading a new menu. By receiving the orders on a familiar screen, time on the line won't require so much mental overhead from ticket reading unfamiliar item sets, and the eye's will adjust. The internal clock will develop rapidly for cook times allowing the employee to discover efficient strategies for high volume shifts without years in the business. Existing employees can get a competitive edge over their peers, or jump to a new station by drilling in advance.

# Function
The app will replicate the square KOS screen at the top of the screen. [Ticket]s come in continuously. 

As [order]s come in, [fooItems] are taken from a [foodBank], placed in/on either:
- [fryer], 2 or client exact count
- [grill], average restaurant size, or client exact size
- [foodItem] will have an associated [cookTime]


Finished items go into a [holdingArea] and dropped into the [order] until the [order] is complete. Multiple [order]s will complete a [ticket].

### Metrics
Things are allowed to be late. Things can over cook a little. Burnt food can be sent out. Items can be skipped. Everything you could do in a real restaurant. A starter restaurant can modeled I'm familiar with and I'll pitch them app. If they say no I'll make it generic.

## Tech Stack
Should optimize for a
- gaming like interface where the items a draggable. simple animations easy to integrate.
- global running timer with tickets on per ticket clocks for cook times.
- potentially many objects with different property lists, cook times, menuItems holding full objects with times and states.
- A screen size close to what most restaurants have as a training table at the job.
- freedom/ability in asset placement on screen with the ability to place things like cooking areas and foodbank naturally on the screen
- easy to install to something like the work tablet so friction in delivery is reduced 
- 