<?php

namespace Hexmedia\AdministratorBundle\Twig\Extension;

use Doctrine\ORM\EntityManager;
use Hexmedia\AdministratorBundle\Twig\TokenParser\ContentTokenParser;


class ContentExtension extends \Twig_Extension
{
    /**
     * @var EntityManager
     */
    private $entityManager;
    private $service;

    public function __construct(EntityManager $entityManager, $service)
    {
        $this->entityManager = $entityManager;
        $this->service = $service;
    }

    /**
     * {@inheritdoc}
     */
    public function getTokenParsers()
    {
        return [
            new ContentTokenParser()
        ];
    }

    /**
     * Returns the name of the extension.
     *
     * @return string The extension name
     */
    public function getName()
    {
        return "content_extension";
    }

    /**
     * @param \Hexmedia\ContentBundle\Entity\Page $entity
     * @param $type
     * @param string $field
     * @param null $tag
     * @param string $class
     * @param string  $language
     * @throws Exception
     * @return string
     */
    public function get($entity, $type, $field, $tag = null, $class = null, $language = null)
    {
        /**
         * @var \Symfony\Component\HttpFoundation\Request
         */
        $request = $this->service->get('request');

        if ($tag == null) {
            $tag = 'div';
        }

        $slug = $request->get('ident');

        $locale = $request->getLocale();

        $getter = "get" . ucfirst($field);

        $twig = $this->service->get("twig");

        if ($this->service->get('session')->get('hexmedia_content_edit_mode')) {
            $content = $twig->render(
                "HexmediaContentBundle:Content:content-editable.html.twig",
                [
                    'content' =>  $entity->$getter(),
                    'tag' => $tag,
                    'id' => $entity->getId(),
                    'field' => $field,
                    'class' => $class,
                    'type' => $type
                ]
            );
        } else {
            $content = $twig->render(
                "HexmediaContentBundle:Content:content.html.twig",
                [
                    'content' =>  $entity->$getter(),
                    'id' => $entity->getId(),
                    'field' => $field,
                    'tag' => $tag,
                    'class' => $class,
                    'type' => $type
                ]
            );
        }

        return $content; //$entity->getContent();
    }
}