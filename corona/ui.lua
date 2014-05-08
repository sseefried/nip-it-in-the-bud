local header1 = display.newText("_", sw/2, 20, native.systemFont, 20 )
local header2 = display.newText("_", sw/2, 40, native.systemFont, 20 )
function status(a,b) a.text = b end

function createButton(level)
	local button = display.newGroup()
	local rect = display.newRect(button, 0, 0, 50, 20)
	rect:setFillColor(1, 0, 1, 0.4)
	local t = display.newText(button, level, 0, 0, native.systemFont, 20 )
	button.x = level * 60
	button.y = sh - 20
	button.level = level
	button:addEventListener("touch", function(e)
		if e.phase == "began" then
			status(header1, "playing level " .. e.target.level)
			Runtime:dispatchEvent({name = "newlevel", newlevel = e.target.level})
		end
	end)
	return button
end
createButton(1)
createButton(2)
createButton(3)
createButton(4)


Runtime:addEventListener("count", function(e)
	status(header2, e.count)
end )
Runtime:addEventListener("gamestate", function(e)
	status(header1, e.gamestate)
end )
