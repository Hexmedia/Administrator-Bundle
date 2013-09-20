<?php

namespace Hexmedia\AdministratorBundle\Twig\TokenParser;

use Hexmedia\AdministratorBundle\Twig\Node\ListScriptNode;

class ListSciptTokenParser extends \Twig_TokenParser {

    /**
     * {@inheritdoc}
     */
    public function parse(\Twig_Token $token)
    {
        $lineNumber = $token->getLine();
        $stream = $this->parser->getStream();

        $namespace = $stream->expect(\Twig_Token::NAME_TYPE)->getValue();
        $bundle = $stream->expect(\Twig_Token::NAME_TYPE)->getValue();
        $controller = $stream->expect(\Twig_Token::NAME_TYPE)->getValue();

        $stream->expect(\Twig_Token::BLOCK_END_TYPE);

        return new ListScriptNode($namespace, $bundle, $controller, $lineNumber, $this->getTag());

    }

    /**
     * {@inheritdoc}
     */
    public function getTag()
    {
        return 'list_script';
    }
}