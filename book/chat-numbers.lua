-- Prefix each chapter title with "Chat N: ", numbered in the order the files are given.
local n = 0

function Header(h)
  if h.level == 1 then
    n = n + 1
    local prefix = { pandoc.Str("Chat"), pandoc.Space(), pandoc.Str(n .. ":"), pandoc.Space() }
    for i = #prefix, 1, -1 do
      h.content:insert(1, prefix[i])
    end
  end
  return h
end
